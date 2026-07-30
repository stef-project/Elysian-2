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
 * Point d'entrée principal, appelé par WebApp.gs.
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
    const existingBooking = findBookingByRequestId_(bookingRequestId);
    if (existingBooking) {
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
    }

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

    const clientId = tokenRow.client_id;
    const packageId = tokenRow.package_id;

    // Re-vérification complète du forfait (jamais confiance dans ce qu'affiche le site).
    const pkg = findPackageById_(packageId);
    if (!pkg || pkg.client_id !== clientId) {
      throw new BookingBusinessError_('Forfait introuvable.');
    }
    if (pkg.statut !== PACKAGE_STATUS.ACTIVE) {
      throw new BookingBusinessError_('Ce forfait n\'est pas actif.');
    }
    if (pkg.date_expiration) {
      const exp = new Date(pkg.date_expiration);
      if (!isNaN(exp.getTime()) && exp < new Date()) {
        throw new BookingBusinessError_('Ce forfait est expiré.');
      }
    }
    const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
    if (included.indexOf(serviceId) === -1) {
      throw new BookingBusinessError_('Ce soin n\'est pas inclus dans ce forfait.');
    }
    if (Number(pkg.available_sessions) < 1) {
      throw new BookingBusinessError_('Aucune séance disponible sur ce forfait.');
    }
    if (!isSlotStillFree(startIso, endIso)) {
      throw new BookingBusinessError_('Ce créneau vient d\'être réservé par quelqu\'un d\'autre. Merci d\'en choisir un autre.');
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
      history_notes: '',
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
      event = createCalendarEventForBooking_(bookingId, clientId, serviceId, startIso, endIso);
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
    updateRow_(TABS.SESSION_TOKENS, tokenRow.rowNumber, {
      used_for_booking_request_id: bookingRequestId,
    });
    writeAuditLog_(clientId, 'create_booking', bookingId, '', 'confirmed', 'Réservation via forfait');

    return { status: 'confirmed', calendarEventId: event.getId() };
  } finally {
    lock.releaseLock();
  }
}

/** Crée l'événement Calendar avec une référence traçable au booking_id dans la description. */
function createCalendarEventForBooking_(bookingId, clientId, serviceId, startIso, endIso) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const client = findRowBy_(TABS.CLIENTS, 'client_id', clientId);
  const clientLabel = client ? `${client.prenom} ${client.nom}` : clientId;

  return calendar.createEvent(
    `${serviceId} — ${clientLabel} (forfait)`,
    new Date(startIso),
    new Date(endIso),
    {
      description: `booking_id: ${bookingId}\nclient_id: ${clientId}\nservice: ${serviceId}\nRéservé via forfait prépayé.`,
      guests: client ? client.email : undefined,
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
  const packagesSheetRow = findPackageById_(pendingBooking.package_id).rowNumber;
  let event;
  try {
    event = createCalendarEventForBooking_(
      pendingBooking.booking_id,
      pendingBooking.client_id,
      pendingBooking.service_id,
      pendingBooking.start_datetime,
      pendingBooking.end_datetime
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
