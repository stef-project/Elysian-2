/**
 * ============================================================================
 *  RECONCILIATION.gs — Contrôle quotidien : signale, ne corrige jamais
 *  silencieusement en cas de doute.
 * ============================================================================
 *
 *  Un seul cas est corrigé automatiquement (justifié dans le cadrage) :
 *  un Booking "pending" depuis plus de reconciliation_stale_pending_minutes
 *  SANS calendar_event_id — dans ce cas précis, on sait avec certitude
 *  qu'aucun événement n'a jamais été créé, donc la restauration est sûre.
 *
 *  À brancher sur un déclencheur horaire/quotidien (voir README) :
 *  Apps Script → Déclencheurs → Ajouter un déclencheur →
 *  runReconciliationCheck → Basé sur le temps → Minuteries jour → 1x/jour.
 */

function runReconciliationCheck() {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const bookings = readAllRows_(TABS.BOOKINGS);
  const packages = readAllRows_(TABS.PACKAGES);
  const issues = [];

  // --- 1. Booking confirmed sans calendar_event_id ---
  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && !b.calendar_event_id)
    .forEach((b) => issues.push(['confirmed_without_event', b.booking_id, 'Booking confirmed sans calendar_event_id']));

  // --- 2 & 6. Événements Calendar avec marqueur booking_id, orphelins ou dupliqués ---
  const lookaheadStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lookaheadEnd = new Date(Date.now() + settings.lookahead_days * 24 * 60 * 60 * 1000);
  const events = calendar.getEvents(lookaheadStart, lookaheadEnd);
  const eventsByBookingId = {};
  events.forEach((e) => {
    const bId = extractBookingIdFromDescription_(e.getDescription());
    if (bId) {
      if (!eventsByBookingId[bId]) eventsByBookingId[bId] = [];
      eventsByBookingId[bId].push(e);
    }
  });

  Object.keys(eventsByBookingId).forEach((bId) => {
    const matchingEvents = eventsByBookingId[bId];
    const booking = bookings.find((b) => b.booking_id === bId);

    if (matchingEvents.length > 1) {
      issues.push(['duplicate_calendar_events', bId, `${matchingEvents.length} événements Calendar référencent ce booking_id`]);
      return;
    }

    if (!booking) {
      issues.push(['orphan_calendar_event', bId, 'Événement Calendar sans ligne Booking correspondante']);
      return;
    }

    if (booking.status === BOOKING_STATUS.PENDING) {
      // Correspondance unique et non ambiguë : on complète l'enregistrement.
      updateRow_(TABS.BOOKINGS, booking.rowNumber, {
        calendar_event_id: matchingEvents[0].getId(),
        status: BOOKING_STATUS.CONFIRMED,
        updated_at: new Date(),
      });
      writeAuditLog_('system', 'reconciliation_auto_complete', bId, 'pending', 'confirmed', 'Événement retrouvé, complétion automatique sûre');
    }
  });

  // --- 3. Rendez-vous passé toujours confirmed ---
  const now = new Date();
  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && new Date(b.end_datetime) < now)
    .forEach((b) => issues.push(['past_still_confirmed', b.booking_id, 'RDV passé, statut toujours confirmed — à traiter (utilisée / no-show)']));

  // --- 5. booking_request_id en double ---
  const requestIdCounts = {};
  bookings.forEach((b) => {
    requestIdCounts[b.booking_request_id] = (requestIdCounts[b.booking_request_id] || 0) + 1;
  });
  Object.keys(requestIdCounts).forEach((rid) => {
    if (requestIdCounts[rid] > 1) {
      issues.push(['duplicate_booking_request_id', rid, `${requestIdCounts[rid]} lignes Bookings partagent ce booking_request_id`]);
    }
  });

  // --- 7. Événement déplacé/supprimé directement dans Calendar ---
  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && b.calendar_event_id)
    .forEach((b) => {
      try {
        const event = calendar.getEventById(b.calendar_event_id);
        if (!event) {
          issues.push(['event_deleted_externally', b.booking_id, 'Événement introuvable dans Calendar (supprimé hors système ?)']);
        }
      } catch (e) {
        issues.push(['event_lookup_error', b.booking_id, String(e)]);
      }
    });

  // --- 4 & 8. Cohérence des compteurs de séances ---
  packages.forEach((pkg) => {
    const total = Number(pkg.total_sessions);
    const sum = Number(pkg.available_sessions) + Number(pkg.reserved_sessions) + Number(pkg.used_sessions);
    if (total !== sum) {
      issues.push(['session_count_mismatch', pkg.package_id, `total_sessions=${total} mais available+reserved+used=${sum}`]);
    }

    const reservedBookingsCount = bookings.filter(
      (b) => b.package_id === pkg.package_id && b.status === BOOKING_STATUS.CONFIRMED && new Date(b.end_datetime) >= now
    ).length;
    if (reservedBookingsCount !== Number(pkg.reserved_sessions)) {
      issues.push(['reserved_count_mismatch', pkg.package_id, `reserved_sessions=${pkg.reserved_sessions} mais ${reservedBookingsCount} Bookings confirmed à venir`]);
    }
  });

  // --- Forfaits orphelins : client_id sans ligne Clients correspondante ---
  // Cause typique : une cliente supprimée à la main dans l'onglet Clients
  // alors que ses forfaits restent. Ces forfaits deviennent invisibles dans
  // /admin (la vue part des clientes) — signalé, jamais corrigé d'office.
  const knownClientIds = new Set(readAllRows_(TABS.CLIENTS).map((c) => String(c.client_id).trim()));
  packages
    .filter((p) => p.client_id && !knownClientIds.has(String(p.client_id).trim()))
    .forEach((p) => issues.push([
      'package_orphan_client', p.package_id,
      `client_id "${p.client_id}" introuvable dans Clients (cliente supprimée ?) — forfait invisible dans /admin`,
    ]));

  // --- Correction automatique sûre : pending ancien sans calendar_event_id ---
  const staleThreshold = new Date(Date.now() - settings.reconciliation_stale_pending_minutes * 60 * 1000);
  bookings
    .filter((b) => b.status === BOOKING_STATUS.PENDING && !b.calendar_event_id && new Date(b.created_at) < staleThreshold)
    .forEach((b) => {
      const pkg = findPackageById_(b.package_id);
      if (pkg) {
        updateRow_(TABS.PACKAGES, pkg.rowNumber, {
          available_sessions: Number(pkg.available_sessions) + 1,
          reserved_sessions: Number(pkg.reserved_sessions) - 1,
        });
      }
      updateRow_(TABS.BOOKINGS, b.rowNumber, { status: BOOKING_STATUS.FAILED, updated_at: new Date() });
      writeAuditLog_('system', 'reconciliation_auto_restore_stale_pending', b.booking_id, 'pending', 'failed', 'pending ancien sans événement Calendar — restauration sûre');
    });

  // --- Correction automatique sûre (Phase 2, Étape B) : offres expirées ---
  // Fait objectif et sans ambiguïté (comparaison de dates) — ne touche à
  // aucun forfait ni paiement, donc sans risque, contrairement à toute autre
  // anomalie qui reste seulement signalée.
  const nowForOffers = new Date();
  readAllRows_(TABS.PACKAGE_OFFERS)
    .filter((o) => o.date_expiration_lien && new Date(o.date_expiration_lien) < nowForOffers &&
      [OFFER_STATUS.EXPIRED, OFFER_STATUS.DECLINED, OFFER_STATUS.CANCELLED, OFFER_STATUS.PAID].indexOf(o.statut) === -1)
    .forEach((o) => {
      updateRow_(TABS.PACKAGE_OFFERS, o.rowNumber, { statut: OFFER_STATUS.EXPIRED });
      writeAuditLog_('system', 'offer_expired_reconciliation', o.offer_id, o.statut, OFFER_STATUS.EXPIRED, 'Expiration automatique (réconciliation quotidienne)');
    });

  // --- Correction automatique sûre : codes promo expirés ---
  // Même principe que les offres : comparaison de dates objective, aucun
  // paiement ni forfait touché. Sans cette passe, un code périmé resterait
  // au statut "active" tant que personne n'essaie de l'utiliser côté admin.
  readAllRows_(TABS.PROMO_CODES)
    .filter((p) => p.statut === PROMO_CODE_STATUS.ACTIVE && p.date_expiration &&
      !isNaN(new Date(p.date_expiration).getTime()) && new Date(p.date_expiration) < nowForOffers)
    .forEach((p) => {
      updateRow_(TABS.PROMO_CODES, p.rowNumber, { statut: PROMO_CODE_STATUS.EXPIRED });
      writeAuditLog_('system', 'promo_code_expired_reconciliation', p.promo_code_id, PROMO_CODE_STATUS.ACTIVE, PROMO_CODE_STATUS.EXPIRED, 'Expiration automatique (réconciliation quotidienne)');
    });

  // --- Nettoyage : codes de vérification et jetons de session périmés ---
  // Une ligne est écrite à CHAQUE demande de code / session, et chaque
  // vérification relit tout l'onglet : sans purge, le parcours cliente
  // ralentit indéfiniment. Aucune valeur à conserver au-delà de quelques
  // jours — l'Audit_Log garde déjà la trace de chaque demande, et seules
  // des lignes expirées (inutilisables) sont supprimées.
  purgeExpiredRows_(TABS.VERIFICATION_CODES, 'expires_at', 7);
  purgeExpiredRows_(TABS.SESSION_TOKENS, 'expires_at', 7);

  // --- Écriture des anomalies détectées ---
  writeReconciliationIssues_(issues);

  Logger.log(`Réconciliation terminée : ${issues.length} anomalie(s) signalée(s).`);
  return issues.length;
}

/**
 * Supprime les lignes d'un onglet dont la colonne d'expiration est dépassée
 * depuis plus de retentionDays jours. Suppression de bas en haut pour que
 * les numéros de ligne restent valides pendant l'opération.
 */
function purgeExpiredRows_(tabName, expiryColumn, retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const sh = sheet_(tabName);
  if (!sh) return;

  const toDelete = readAllRows_(tabName)
    .filter((r) => {
      const exp = new Date(r[expiryColumn]);
      return !isNaN(exp.getTime()) && exp < cutoff;
    })
    .map((r) => r.rowNumber)
    .sort((a, b) => b - a);

  toDelete.forEach((rowNumber) => sh.deleteRow(rowNumber));
  if (toDelete.length > 0) {
    writeAuditLog_('system', 'purge_expired_rows', tabName, '', String(toDelete.length),
      `Lignes expirées depuis plus de ${retentionDays} jours supprimées (réconciliation quotidienne)`);
  }
}

/** Écrit les anomalies détectées dans l'onglet Reconciliation_Issues. */
function writeReconciliationIssues_(issues) {
  issues.forEach(([type, entity, details]) => {
    appendRow_(TABS.RECONCILIATION_ISSUES, {
      timestamp_detection: new Date(),
      type_anomalie: type,
      entite_concernee: entity,
      details: details,
      statut: 'a_verifier',
      resolution_notes: '',
    });
  });
}
