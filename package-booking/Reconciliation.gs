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

  // --- Écriture des anomalies détectées ---
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

  Logger.log(`Réconciliation terminée : ${issues.length} anomalie(s) signalée(s).`);
  return issues.length;
}
