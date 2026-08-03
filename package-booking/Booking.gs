/**
 * ============================================================================
 *  BOOKING.gs — Le workflow transactionnel (cœur du système).
 * ============================================================================
 *
 *  Sheets et Calendar sont deux systèmes SANS transaction commune. Ce fichier
 *  gère donc explicitement les statuts intermédiaires (pending/confirmed/
 *  failed), l'idempotence par booking_request_id, et la récupération sûre
 *  en cas d'échec partiel. Voir le document de cadrage pour le détail des
 *  11 étapes — ce code les implémente une à une, dans l'ordre.
 *
 *  Erreur métier volontairement générique envoyée au client : jamais de
 *  trace technique (stack, message d'exception brut) ne sort de cette
 *  fonction vers le site.
 */

/** Erreur "propre" destinée à être affichée telle quelle côté client (message court, sans détail technique). */
function BookingBusinessError_(message) {
  this.name = 'BookingBusinessError';
  this.message = message;
}
BookingBusinessError_.prototype = Object.create(Error.prototype);

/**
 * Point d'entrée principal du parcours PUBLIC (site), appelé par WebApp.gs.
 *
 * @param {string} sessionTokenPlain - jeton reçu du client (en clair, jamais stocké tel quel).
 * @param {string} bookingRequestId - UUID généré côté site, unique par tentative de réservation.
 * @param {string} serviceId - identifiant du soin (doit correspondre à soins_inclus du forfait).
 * @param {string} startIso / endIso - créneau choisi (ISO 8601).
 * @returns {{status: string, calendarEventId: string}}
 */
function confirmPackageBooking(sessionTokenPlain, bookingRequestId, serviceId, startIso, endIso) {
  if (!sessionTokenPlain || !bookingRequestId || !serviceId || !startIso || !endIso) {
    throw new BookingBusinessError_('Requête incomplète.');
  }

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);
  if (!gotLock) {
    throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');
  }

  try {
    // --- Étape 3 : idempotence — cette demande a-t-elle déjà été traitée ? ---
    // (Volontairement AVANT la validation du jeton : une demande déjà
    // confirmed/pending/failed se résout par son booking_request_id seul,
    // sans dépendre à nouveau du jeton — comportement V1 inchangé.)
    const idempotent = resolveIdempotentBookingResult_(bookingRequestId);
    if (idempotent) return idempotent;

    // --- Étape 4 : validation du jeton de session ---
    const tokenHash = hashWithPepper_(sessionTokenPlain);
    const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
    if (!tokenRow) {
      throw new BookingBusinessError_('Session invalide, merci de recommencer la vérification.');
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      throw new BookingBusinessError_('Session expirée, merci de recommencer la vérification.');
    }
    if (tokenRow.used_for_booking_request_id && tokenRow.used_for_booking_request_id !== bookingRequestId) {
      throw new BookingBusinessError_('Cette session a déjà été utilisée pour une autre réservation.');
    }

    // --- Étapes 5 à 9 : cœur du saga, partagé avec le parcours admin (voir adminCreatePackageBooking_) ---
    const result = createNewPackageBooking_(tokenRow.client_id, tokenRow.package_id, serviceId, startIso, endIso, bookingRequestId, {
      source: BOOKING_SOURCE.PACKAGE_BOOKING,
      createdBy: 'client',
      auditActor: tokenRow.client_id,
      auditAction: 'create_booking',
      auditNote: 'Réservation via forfait',
    });

    updateRow_(TABS.SESSION_TOKENS, tokenRow.rowNumber, {
      used_for_booking_request_id: bookingRequestId,
    });

    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Point d'entrée du parcours ADMINISTRATEUR (menu "Ajouter un rendez-vous
 * forfait", AdminMenu.gs). Même cœur transactionnel que confirmPackageBooking
 * (createNewPackageBooking_) — rien n'est dupliqué. Pas de jeton de session
 * ici : l'administratrice a déjà identifié la cliente et le forfait
 * elle-même dans le formulaire.
 *
 * @param {{origin: string, actor: string, historyNotes: string}} meta
 */
function adminCreatePackageBooking_(clientId, packageId, serviceId, startIso, endIso, bookingRequestId, meta) {
  if (!clientId || !packageId || !serviceId || !startIso || !endIso || !bookingRequestId) {
    throw new BookingBusinessError_('Requête incomplète.');
  }

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);
  if (!gotLock) {
    throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');
  }

  try {
    const idempotent = resolveIdempotentBookingResult_(bookingRequestId);
    if (idempotent) return idempotent;

    const actor = (meta && meta.actor) || 'admin';
    return createNewPackageBooking_(clientId, packageId, serviceId, startIso, endIso, bookingRequestId, {
      source: (meta && meta.origin) || BOOKING_SOURCE.ADMIN_MANUAL,
      createdBy: actor,
      isAdminCreated: true,
      origin: meta && meta.origin,
      historyNotes: meta && meta.historyNotes,
      auditActor: actor,
      auditAction: 'admin_create_booking',
      auditNote: `Rendez-vous forfait ajouté manuellement (origine : ${(meta && meta.origin) || 'n/a'})` +
        (meta && meta.historyNotes ? ` — ${meta.historyNotes}` : ''),
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Étape 3 (idempotence), factorisée pour être partagée entre le parcours
 * public et le parcours admin : une demande portant un booking_request_id
 * déjà traité se résout uniquement par cet identifiant, sans re-jouer aucune
 * autre vérification. Renvoie null si aucune demande existante — dans ce cas
 * l'appelant doit continuer vers createNewPackageBooking_.
 */
function resolveIdempotentBookingResult_(bookingRequestId) {
  const existingBooking = findBookingByRequestId_(bookingRequestId);
  if (!existingBooking) return null;

  if (existingBooking.status === BOOKING_STATUS.CONFIRMED) {
    return { status: 'confirmed', calendarEventId: existingBooking.calendar_event_id };
  }
  if (existingBooking.status === BOOKING_STATUS.FAILED) {
    throw new BookingBusinessError_('Cette tentative de réservation a échoué précédemment. Merci de choisir à nouveau un créneau.');
  }
  if (existingBooking.status === BOOKING_STATUS.PENDING) {
    // Le process précédent a pu s'arrêter avant ou après la création
    // Calendar. On recherche un événement déjà créé avant de retenter,
    // pour ne JAMAIS en créer un deuxième pour la même demande.
    return resumePendingBooking_(existingBooking);
  }
  // Tout autre statut (annulée, reportée, no-show, saisie externe...) : la
  // demande a déjà vécu son cycle de vie complet — on ne recrée JAMAIS une
  // réservation sous le même booking_request_id, sinon deux lignes
  // porteraient le même identifiant d'idempotence.
  throw new BookingBusinessError_('Cette demande de réservation a déjà été traitée. Merci de refaire une nouvelle réservation.');
}

/**
 * Valide qu'un créneau demandé respecte les règles d'ouverture (jour
 * travaillé, horaires, fenêtre de réservation) — appliqué au parcours
 * PUBLIC uniquement : le site ne propose que des créneaux calculés par
 * computeAvailableSlots (mêmes règles), donc une demande hors règles est
 * forcément forgée ou périmée. Le parcours admin garde sa liberté
 * (arrangement exceptionnel hors horaires). Les heures s'évaluent dans le
 * fuseau du script (appsscript.json, Europe/London) — le même que
 * computeAvailableSlots, jamais celui du navigateur de la cliente.
 */
function assertSlotWithinBookingRules_(startIso, endIso) {
  const settings = getSettings();
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new BookingBusinessError_('Créneau invalide.');
  }
  const now = new Date();
  if (start <= now) {
    throw new BookingBusinessError_('Ce créneau est déjà passé, merci d\'en choisir un autre.');
  }
  if (start > new Date(now.getTime() + settings.lookahead_days * 24 * 60 * 60 * 1000)) {
    throw new BookingBusinessError_('Ce créneau est au-delà de la fenêtre de réservation, merci d\'en choisir un autre.');
  }
  const isoWeekday = ((start.getDay() + 6) % 7) + 1; // JS: 0=dimanche -> ISO: 7=dimanche
  if (getWorkdaysArray(settings).indexOf(isoWeekday) === -1) {
    throw new BookingBusinessError_('Ce jour n\'est pas ouvert à la réservation.');
  }
  const closingTime = new Date(start);
  closingTime.setHours(settings.workday_end_hour, 0, 0, 0);
  if (start.getHours() < settings.workday_start_hour || end > closingTime) {
    throw new BookingBusinessError_('Ce créneau est en dehors des horaires d\'ouverture.');
  }
}

/**
 * Cœur du saga (étapes 5 à 9 du cadrage) : re-vérification complète, création
 * de la ligne Bookings en pending, déduction de séance, écriture Calendar,
 * confirmation ou restauration en cas d'échec. Appelé UNIQUEMENT depuis
 * l'intérieur d'un ScriptLock déjà acquis par l'appelant (confirmPackageBooking
 * ou adminCreatePackageBooking_) — ne verrouille pas lui-même.
 *
 * @param {{source: string, createdBy: string, isAdminCreated: boolean,
 *          origin: string, historyNotes: string, auditActor: string,
 *          auditAction: string, auditNote: string}} meta
 */
function createNewPackageBooking_(clientId, packageId, serviceId, startIso, endIso, bookingRequestId, meta) {
  // Re-vérification complète du forfait (jamais confiance dans ce qu'affiche le site ou saisit l'admin).
  const pkg = findPackageById_(packageId);
  if (!pkg || pkg.client_id !== clientId) {
    throw new BookingBusinessError_('Forfait introuvable.');
  }
  if (pkg.statut !== PACKAGE_STATUS.ACTIVE) {
    throw new BookingBusinessError_('Ce forfait n\'est pas actif.');
  }
  if (isPackageExpired_(pkg)) {
    throw new BookingBusinessError_('Ce forfait est expiré.');
  }
  const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
  if (included.indexOf(serviceId) === -1) {
    throw new BookingBusinessError_('Ce soin n\'est pas inclus dans ce forfait.');
  }
  if (Number(pkg.available_sessions) < 1) {
    throw new BookingBusinessError_('Aucune séance disponible sur ce forfait.');
  }
  if (!(meta && meta.isAdminCreated)) {
    assertSlotWithinBookingRules_(startIso, endIso);
  }
  if (!isSlotStillFree(startIso, endIso)) {
    throw new BookingBusinessError_('Ce créneau vient d\'être réservé par quelqu\'un d\'autre. Merci d\'en choisir un autre.');
  }
  if (findDuplicateActiveBooking_(clientId, packageId, serviceId, startIso)) {
    throw new BookingBusinessError_('Un rendez-vous identique existe déjà pour cette cliente.');
  }
  // Calendrier accessible ? Vérifié tôt, avant toute écriture Sheet, pour ne
  // jamais décrémenter une séance si le calendrier configuré est en réalité
  // introuvable/inaccessible (erreur de configuration plutôt qu'échec ponctuel).
  const settingsCheck = getSettings();
  if (!CalendarApp.getCalendarById(settingsCheck.calendar_id)) {
    throw new BookingBusinessError_('Calendrier configuré introuvable ou inaccessible. Contacte l\'administratrice.');
  }

  // --- Étape 5 : créer la ligne Bookings en pending ---
  const bookingId = genId_('BKG');
  appendRow_(TABS.BOOKINGS, {
    booking_id: bookingId,
    booking_request_id: bookingRequestId,
    client_id: clientId,
    package_id: packageId,
    service_id: serviceId,
    status: BOOKING_STATUS.PENDING,
    calendar_event_id: '',
    start_datetime: startIso,
    end_datetime: endIso,
    session_movement: 'available -1 / reserved +1',
    created_at: new Date(),
    updated_at: new Date(),
    history_notes: (meta && meta.historyNotes) || '',
    source: (meta && meta.source) || BOOKING_SOURCE.PACKAGE_BOOKING,
    created_by: (meta && meta.createdBy) || 'client',
  });

  // --- Étape 6 : available -1, reserved +1 ---
  const packagesSheetRow = findPackageById_(packageId).rowNumber;
  updateRow_(TABS.PACKAGES, packagesSheetRow, {
    available_sessions: Number(pkg.available_sessions) - 1,
    reserved_sessions: Number(pkg.reserved_sessions) + 1,
  });

  // --- Étape 7 : forcer l'écriture avant l'appel Calendar ---
  SpreadsheetApp.flush();

  // --- Étape 8 : créer l'événement Calendar ---
  let event;
  try {
    event = createCalendarEventForBooking_(bookingId, clientId, serviceId, startIso, endIso, meta);
  } catch (calendarError) {
    // --- Étape 10 : échec — restauration, jamais de confirmation ---
    restoreFailedBooking_(bookingId, packageId, packagesSheetRow, calendarError);
    throw new BookingBusinessError_('La réservation n\'a pas pu être finalisée. Merci de réessayer.');
  }

  // --- Étape 9 : succès — enregistrement + confirmation ---
  const bookingRow = findBookingByRequestId_(bookingRequestId);
  updateRow_(TABS.BOOKINGS, bookingRow.rowNumber, {
    calendar_event_id: event.getId(),
    status: BOOKING_STATUS.CONFIRMED,
    updated_at: new Date(),
  });
  writeAuditLog_(
    (meta && meta.auditActor) || clientId,
    (meta && meta.auditAction) || 'create_booking',
    bookingId, '', 'confirmed',
    (meta && meta.auditNote) || 'Réservation via forfait'
  );

  return { status: 'confirmed', calendarEventId: event.getId() };
}

/**
 * Crée l'événement Calendar avec une référence traçable au booking_id dans
 * la description. Le comportement du parcours PUBLIC (client) est
 * inchangé bit pour bit (même titre, même description) — la description
 * enrichie (téléphone, email, origine) n'apparaît que pour les rendez-vous
 * créés par l'administratrice (meta.isAdminCreated), jamais dans le titre.
 *
 * ⚠️ "Zone privée" imparfaite : ceci utilise le service CalendarApp de
 * base, où la description est visible par les invités (ici, uniquement la
 * cliente elle-même — jamais un tiers). Une vraie zone privée invisible
 * même à la cliente nécessiterait le service avancé Calendar (extendedProperties.private),
 * qui changerait la façon dont les événements sont créés dans tout ce
 * fichier — non fait ici pour ne pas fragiliser la V1 ; amélioration
 * possible plus tard si besoin réel.
 */
function createCalendarEventForBooking_(bookingId, clientId, serviceId, startIso, endIso, meta) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const client = findRowBy_(TABS.CLIENTS, 'client_id', clientId);
  const clientLabel = client ? `${client.prenom} ${client.nom}` : clientId;

  let description = `booking_id: ${bookingId}\nclient_id: ${clientId}\nservice: ${serviceId}\n`;
  if (meta && meta.isAdminCreated) {
    if (meta.origin) description += `origine: ${meta.origin}\n`;
    if (client && client.telephone) description += `telephone: ${client.telephone}\n`;
    if (client && client.email) description += `email: ${client.email}\n`;
    description += 'Rendez-vous forfait ajouté manuellement par l\'administratrice.';
  } else {
    description += 'Réservé via forfait prépayé.';
  }

  return calendar.createEvent(
    `${serviceId} — ${clientLabel} (forfait)`,
    new Date(startIso),
    new Date(endIso),
    {
      description: description,
      guests: client && client.email ? client.email : undefined,
      sendInvites: true,
    }
  );
}

/** Restaure une séance après échec de création Calendar (étape 10 du workflow). */
function restoreFailedBooking_(bookingId, packageId, packagesSheetRow, error) {
  const pkg = findPackageById_(packageId);
  updateRow_(TABS.PACKAGES, packagesSheetRow, {
    available_sessions: Number(pkg.available_sessions) + 1,
    reserved_sessions: Number(pkg.reserved_sessions) - 1,
  });
  const bookingRow = findRowBy_(TABS.BOOKINGS, 'booking_id', bookingId);
  if (bookingRow) {
    updateRow_(TABS.BOOKINGS, bookingRow.rowNumber, {
      status: BOOKING_STATUS.FAILED,
      updated_at: new Date(),
      history_notes: `Échec création Calendar : ${error && error.message ? error.message : 'erreur inconnue'}`,
    });
  }
  writeAuditLog_('system', 'booking_failed_restored', bookingId, 'reserved', 'available', String(error));
}

/**
 * Reprend une réservation restée en "pending" (process précédent interrompu).
 * Recherche d'abord si l'événement Calendar a bien été créé avant de retenter
 * — ne crée JAMAIS un deuxième événement pour la même demande.
 */
function resumePendingBooking_(pendingBooking) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const found = searchCalendarEventByBookingId_(
    calendar,
    pendingBooking.booking_id,
    new Date(pendingBooking.start_datetime),
    new Date(pendingBooking.end_datetime)
  );

  if (found) {
    updateRow_(TABS.BOOKINGS, pendingBooking.rowNumber, {
      calendar_event_id: found.getId(),
      status: BOOKING_STATUS.CONFIRMED,
      updated_at: new Date(),
    });
    writeAuditLog_('system', 'resume_pending_adopted_event', pendingBooking.booking_id, 'pending', 'confirmed', 'Événement retrouvé au retry');
    return { status: 'confirmed', calendarEventId: found.getId() };
  }

  // Aucun événement trouvé : sûr de continuer la création maintenant.
  // Reconstruit un meta minimal à partir de la ligne Bookings elle-même
  // (source/created_by déjà enregistrés à l'étape 5), pour que la
  // description reste cohérente même si la création reprend après coupure.
  const reconstructedMeta = {
    isAdminCreated: !!(pendingBooking.created_by && pendingBooking.created_by !== 'client'),
    origin: pendingBooking.source,
  };
  const packagesSheetRow = findPackageById_(pendingBooking.package_id).rowNumber;
  let event;
  try {
    event = createCalendarEventForBooking_(
      pendingBooking.booking_id,
      pendingBooking.client_id,
      pendingBooking.service_id,
      pendingBooking.start_datetime,
      pendingBooking.end_datetime,
      reconstructedMeta
    );
  } catch (calendarError) {
    restoreFailedBooking_(pendingBooking.booking_id, pendingBooking.package_id, packagesSheetRow, calendarError);
    throw new BookingBusinessError_('La réservation n\'a pas pu être finalisée. Merci de réessayer.');
  }

  updateRow_(TABS.BOOKINGS, pendingBooking.rowNumber, {
    calendar_event_id: event.getId(),
    status: BOOKING_STATUS.CONFIRMED,
    updated_at: new Date(),
  });
  writeAuditLog_('system', 'resume_pending_created_event', pendingBooking.booking_id, 'pending', 'confirmed', 'Retry après interruption');
  return { status: 'confirmed', calendarEventId: event.getId() };
}

/**
 * Recherche, parmi les événements du calendrier proches du créneau attendu,
 * celui dont la description contient "booking_id: <id>". Réutilisé par
 * Reconciliation.gs.
 */
function searchCalendarEventByBookingId_(calendar, bookingId, approxStart, approxEnd) {
  const marginMs = 24 * 60 * 60 * 1000; // marge large pour tolérer un léger décalage éventuel
  const searchStart = new Date(approxStart.getTime() - marginMs);
  const searchEnd = new Date(approxEnd.getTime() + marginMs);
  const events = calendar.getEvents(searchStart, searchEnd);
  return events.find((e) => {
    const desc = e.getDescription() || '';
    return desc.indexOf(`booking_id: ${bookingId}`) !== -1;
  }) || null;
}

/**
 * Extrait le booking_id du marqueur "booking_id: <id>" dans une description
 * d'événement Calendar, ou null si absent. Convention partagée par
 * createCalendarEventForBooking_ (écriture), Reconciliation.gs et
 * AdminMenu.gs → adminLinkCalendarEventToPackage (lecture) — un seul endroit
 * qui connaît le format exact du marqueur.
 */
function extractBookingIdFromDescription_(description) {
  const match = String(description || '').match(/booking_id:\s*(\S+)/);
  return match ? match[1] : null;
}
