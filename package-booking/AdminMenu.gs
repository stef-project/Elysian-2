/**
 * ============================================================================
 *  ADMINMENU.gs — Menu "Elysian Admin" dans le Google Sheet.
 * ============================================================================
 *
 *  Interface d'administration V1 : le Sheet lui-même, enrichi de ce menu.
 *  Contrôle d'accès = permissions de partage du Sheet (personne d'autre que
 *  les comptes que tu autorises ne peut ouvrir ce fichier).
 *  Toute modification de solde ou de statut passe par writeAuditLog_.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Elysian Admin')
    .addItem('Ajouter une cliente', 'adminAddClient')
    .addItem('Ajouter un forfait', 'adminAddPackage')
    .addSeparator()
    .addItem('Ajuster le solde d\'un forfait', 'adminAdjustBalance')
    .addItem('Marquer une séance utilisée', 'adminMarkSessionUsed')
    .addItem('Restaurer une séance', 'adminRestoreSession')
    .addSeparator()
    .addItem('Reporter un rendez-vous', 'adminRescheduleBooking')
    .addItem('Annuler un rendez-vous (cliente)', 'adminCancelBookingByClient')
    .addItem('Annuler un rendez-vous (institut)', 'adminCancelBookingByInstitute')
    .addSeparator()
    .addItem('Prolonger / suspendre un forfait', 'adminExtendOrSuspendPackage')
    .addItem('Lancer la réconciliation maintenant', 'runReconciliationCheck')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Catalogue de forfaits (Phase 2)')
      .addItem('Ajouter un modèle de forfait', 'adminAddPackageTemplate')
      .addItem('Modifier un modèle de forfait', 'adminEditPackageTemplate')
      .addItem('Activer / désactiver un modèle', 'adminSetPackageTemplateStatus'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Paiements (Phase 2)')
      .addItem('Enregistrer un paiement', 'adminRecordPayment')
      .addItem('Confirmer un paiement en attente', 'adminConfirmPayment')
      .addItem('Marquer un paiement refusé', 'adminMarkPaymentRefused'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Fiche cliente (Phase 2)')
      .addItem('Voir la fiche consolidée d\'une cliente', 'adminViewClientProfile')
      .addItem('Ajouter une réservation manuelle (ClassPass / WhatsApp)', 'adminAddManualBooking'))
    .addToUi();
}

function ui_() { return SpreadsheetApp.getUi(); }

function adminAddClient() {
  const ui = ui_();
  const prenom = ui.prompt('Prénom de la cliente :').getResponseText().trim();
  const nom = ui.prompt('Nom de la cliente :').getResponseText().trim();
  const email = ui.prompt('Email :').getResponseText().trim().toLowerCase();
  const telephone = ui.prompt('Téléphone (optionnel) :').getResponseText().trim();

  if (!email || email.indexOf('@') === -1) {
    ui.alert('Email invalide, opération annulée.');
    return;
  }
  if (findClientByEmail_(email)) {
    ui.alert('Une cliente avec cet email existe déjà.');
    return;
  }

  const clientId = genId_('CLI');
  appendRow_(TABS.CLIENTS, {
    client_id: clientId, prenom, nom, email, telephone,
    notes_admin: '', date_creation: new Date(),
  });
  writeAuditLog_('admin', 'add_client', clientId, '', email, '');
  ui.alert(`Cliente ajoutée : ${clientId}`);
}

/**
 * Attribue un forfait à une cliente. Peut sourcer les valeurs depuis un
 * modèle du catalogue (Package_Templates) — dans ce cas les valeurs sont
 * COPIÉES telles quelles à cet instant (voir en-tête PackageTemplates.gs) —
 * ou être saisies manuellement comme en V1.
 *
 * Le forfait est TOUJOURS créé au statut PENDING_PAYMENT (non réservable —
 * findEligiblePackages_/confirmPackageBooking exigent statut === ACTIVE),
 * puis deux parcours administratifs au choix :
 *
 *  1. "Paiement à recevoir" — le forfait reste pending_payment ; utiliser
 *     ensuite "Enregistrer un paiement" une fois le paiement reçu.
 *  2. "Paiement déjà reçu / forfait historique" — la saisie du paiement
 *     (moyen, brut, frais, référence) se fait immédiatement ici même, via
 *     promptAndRecordPayment_ (Payments.gs, pas dupliqué), et le forfait
 *     passe à ACTIVE dans la foulée. Couvre : historique, Revolut déjà
 *     reçu, virement déjà reçu, carte sur place, espèces, ClassPass, offert
 *     (complimentary), autre paiement externe.
 *
 * Dans tous les cas, aucun forfait n'est jamais activé sans une ligne
 * Payments (trace) — voir Payments.gs pour le motif obligatoire sur les
 * moyens peu traçables (cash / complimentary / other).
 */
function adminAddPackage() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) {
    ui.alert('Aucune cliente avec cet email. Ajoute-la d\'abord.');
    return;
  }

  const templateId = ui.prompt(
    'package_template_id à utiliser (laisser vide pour saisie manuelle comme avant) :'
  ).getResponseText().trim();

  let nomForfait, soinsInclus, totalSessions, dateExpirationRaw = '';

  if (templateId) {
    const tpl = findPackageTemplateById_(templateId);
    if (!tpl) { ui.alert('Modèle introuvable.'); return; }
    nomForfait = tpl.nom;
    soinsInclus = tpl.soins_inclus;
    totalSessions = Number(tpl.nombre_seances);
    if (tpl.duree_validite_jours) {
      const exp = new Date(Date.now() + Number(tpl.duree_validite_jours) * 24 * 60 * 60 * 1000);
      dateExpirationRaw = Utilities.formatDate(exp, getSettings().timezone, 'yyyy-MM-dd');
    }
    ui.alert(`Modèle "${tpl.nom}" : ${totalSessions} séances, ${tpl.prix_public} prix public. Ajuste si besoin aux étapes suivantes.`);
  } else {
    nomForfait = ui.prompt('Nom du forfait (ex. "Pack 5 séances Drainage") :').getResponseText().trim();
    soinsInclus = ui.prompt('Soins inclus, séparés par des virgules (ex. lymphatic-1z, lymphatic-2z) :').getResponseText().trim();
    const totalSessionsRaw = ui.prompt('Nombre total de séances :').getResponseText().trim();
    totalSessions = parseInt(totalSessionsRaw, 10);
    if (isNaN(totalSessions) || totalSessions <= 0) {
      ui.alert('Nombre de séances invalide, opération annulée.');
      return;
    }
    dateExpirationRaw = ui.prompt('Date d\'expiration (AAAA-MM-JJ), laisser vide si aucune :').getResponseText().trim();
  }

  const dejaRecu = ui.alert(
    'Ce paiement est-il déjà reçu (historique, Revolut, virement, carte sur place, espèces, ' +
    'ClassPass, offert, autre) ?\n\nOUI = saisie du paiement maintenant, forfait activé immédiatement.\n' +
    'NON = forfait créé "en attente de paiement", à activer plus tard via "Enregistrer un paiement".',
    ui.ButtonSet.YES_NO
  );

  const packageId = genId_('PKG');
  appendRow_(TABS.PACKAGES, {
    package_id: packageId,
    client_id: client.client_id,
    nom_forfait: nomForfait,
    soins_inclus: soinsInclus,
    total_sessions: totalSessions,
    available_sessions: totalSessions,
    reserved_sessions: 0,
    used_sessions: 0,
    date_achat: new Date(),
    date_expiration: dateExpirationRaw || '',
    moyen_paiement: '',
    statut: PACKAGE_STATUS.PENDING_PAYMENT,
    notes_admin: '',
    package_template_id: templateId || '',
  });
  writeAuditLog_('admin', 'add_package', packageId, '', `${totalSessions} séances (pending_payment)`, '');

  if (dejaRecu !== ui.Button.YES) {
    ui.alert(`Forfait créé : ${packageId} — statut "pending_payment", pas encore réservable.\n\nUtilise "Enregistrer un paiement" pour l'activer une fois le paiement reçu.`);
    return;
  }

  const paymentId = promptAndRecordPayment_(packageId, { forceConfirmed: true });
  if (!paymentId) {
    ui.alert(`Forfait créé : ${packageId}, mais la saisie du paiement a été annulée — reste "pending_payment". Utilise "Enregistrer un paiement" pour finaliser.`);
    return;
  }
  ui.alert(`Forfait créé et activé : ${packageId} (paiement ${paymentId}).`);
}

/**
 * Saisie manuelle d'une réservation externe (ClassPass ou WhatsApp), pour la
 * fiche cliente uniquement — ne crée AUCUN événement Calendar et ne touche à
 * aucun compteur de forfait. N'importe/synchronise jamais automatiquement
 * ClassPass : purement déclaratif, saisi à la main par l'administratrice.
 */
function adminAddManualBooking() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Aucune cliente avec cet email. Ajoute-la d\'abord.'); return; }

  const sourceRaw = ui.prompt('Source : "classpass" ou "whatsapp" (ou "other") :').getResponseText().trim().toLowerCase();
  if ([BOOKING_SOURCE.CLASSPASS, BOOKING_SOURCE.WHATSAPP, BOOKING_SOURCE.OTHER].indexOf(sourceRaw) === -1) {
    ui.alert('Source invalide.');
    return;
  }

  const serviceId = ui.prompt('Soin (ex. lymphatic-1z) :').getResponseText().trim();
  const startRaw = ui.prompt('Date/heure du rendez-vous (AAAA-MM-JJ HH:MM) :').getResponseText().trim();
  const start = new Date(startRaw.replace(' ', 'T'));
  if (isNaN(start.getTime())) { ui.alert('Date invalide.'); return; }
  const notes = ui.prompt('Notes (optionnel) :').getResponseText().trim();

  const bookingId = genId_('BKG');
  appendRow_(TABS.BOOKINGS, {
    booking_id: bookingId,
    booking_request_id: '',
    client_id: client.client_id,
    package_id: '',
    service_id: serviceId,
    status: BOOKING_STATUS.EXTERNAL_MANUAL,
    calendar_event_id: '',
    start_datetime: start.toISOString(),
    end_datetime: start.toISOString(),
    session_movement: 'aucun (réservation externe, hors forfait)',
    created_at: new Date(),
    updated_at: new Date(),
    history_notes: notes,
    source: sourceRaw,
  });
  writeAuditLog_('admin', 'add_manual_booking', bookingId, '', sourceRaw, 'Saisie manuelle pour fiche cliente');
  ui.alert(`Réservation manuelle enregistrée : ${bookingId} (source : ${sourceRaw}). Visible dans la fiche cliente.`);
}

function adminAdjustBalance() {
  const ui = ui_();
  const packageId = ui.prompt('package_id à ajuster :').getResponseText().trim();
  const pkg = findPackageById_(packageId);
  if (!pkg) { ui.alert('Forfait introuvable.'); return; }

  const field = ui.prompt('Quel compteur ajuster ? (available_sessions / reserved_sessions / used_sessions)').getResponseText().trim();
  if (['available_sessions', 'reserved_sessions', 'used_sessions'].indexOf(field) === -1) {
    ui.alert('Compteur invalide.'); return;
  }
  const newValueRaw = ui.prompt(`Nouvelle valeur pour ${field} (actuel : ${pkg[field]}) :`).getResponseText().trim();
  const newValue = parseInt(newValueRaw, 10);
  if (isNaN(newValue) || newValue < 0) { ui.alert('Valeur invalide.'); return; }

  const motif = ui.prompt('Motif de cet ajustement (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire, opération annulée.'); return; }

  const oldValue = pkg[field];
  const updates = {};
  updates[field] = newValue;
  updateRow_(TABS.PACKAGES, pkg.rowNumber, updates);
  writeAuditLog_('admin', 'adjust_balance', packageId, `${field}=${oldValue}`, `${field}=${newValue}`, motif);
  ui.alert('Solde ajusté.');
}

function adminMarkSessionUsed() {
  adjustAfterAppointment_('used');
}

function adminRestoreSession() {
  adjustAfterAppointment_('restore');
}

/** Utilisé par "marquer utilisée" / "restaurer" : déplace reserved -> used ou reserved -> available. */
function adjustAfterAppointment_(outcome) {
  const ui = ui_();
  const bookingId = ui.prompt('booking_id concerné :').getResponseText().trim();
  const booking = findRowBy_(TABS.BOOKINGS, 'booking_id', bookingId);
  if (!booking) { ui.alert('Rendez-vous introuvable.'); return; }
  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    ui.alert(`Ce rendez-vous n'est pas au statut confirmed (statut actuel : ${booking.status}).`);
    return;
  }

  const pkg = findPackageById_(booking.package_id);
  const motif = ui.prompt('Motif (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire.'); return; }

  if (outcome === 'used') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1,
      used_sessions: Number(pkg.used_sessions) + 1,
    });
    updateRow_(TABS.BOOKINGS, booking.rowNumber, { status: BOOKING_STATUS.NO_SHOW_OR_LATE_CANCEL, updated_at: new Date() });
  } else {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1,
      available_sessions: Number(pkg.available_sessions) + 1,
    });
    updateRow_(TABS.BOOKINGS, booking.rowNumber, { status: BOOKING_STATUS.CANCELLED_AUTHORIZED, updated_at: new Date() });
  }
  writeAuditLog_('admin', 'mark_session_' + outcome, bookingId, 'reserved', outcome, motif);
  ui.alert('Fait.');
}

function adminCancelBookingByClient() {
  cancelBooking_(false);
}

function adminCancelBookingByInstitute() {
  cancelBooking_(true);
}

/**
 * Annulation avec application automatique des règles :
 * - à l'initiative de l'institut → toujours restaurée ;
 * - sinon : délai ≥ cancellation_deadline_hours → restaurée,
 *           délai < cancellation_deadline_hours → utilisée, sauf dérogation motivée.
 */
function cancelBooking_(isInstituteInitiated) {
  const ui = ui_();
  const bookingId = ui.prompt('booking_id à annuler :').getResponseText().trim();
  const booking = findRowBy_(TABS.BOOKINGS, 'booking_id', bookingId);
  if (!booking) { ui.alert('Rendez-vous introuvable.'); return; }
  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    ui.alert(`Ce rendez-vous n'est pas au statut confirmed (statut actuel : ${booking.status}).`);
    return;
  }

  const settings = getSettings();
  const hoursUntilStart = (new Date(booking.start_datetime) - new Date()) / (60 * 60 * 1000);
  let outcome = isInstituteInitiated || hoursUntilStart >= settings.cancellation_deadline_hours ? 'restore' : 'used';

  let motif = '';
  if (!isInstituteInitiated && hoursUntilStart < settings.cancellation_deadline_hours) {
    const override = ui.alert(
      `Annulation tardive (${hoursUntilStart.toFixed(1)}h avant le RDV). Règle par défaut : séance considérée utilisée.\n\nVeux-tu déroger et la restaurer quand même ?`,
      ui.ButtonSet.YES_NO
    );
    if (override === ui.Button.YES) {
      outcome = 'restore';
      motif = ui.prompt('Motif de la dérogation (obligatoire) :').getResponseText().trim();
      if (!motif) { ui.alert('Motif obligatoire pour une dérogation, opération annulée.'); return; }
    }
  } else {
    motif = isInstituteInitiated ? 'Annulation à l\'initiative de l\'institut' : 'Annulation ≥ délai autorisé';
  }

  // Supprimer l'événement Calendar.
  const settings2 = getSettings();
  const calendar = CalendarApp.getCalendarById(settings2.calendar_id);
  if (booking.calendar_event_id) {
    try {
      const event = calendar.getEventById(booking.calendar_event_id);
      if (event) event.deleteEvent();
    } catch (e) {
      // L'événement a peut-être déjà été supprimé manuellement — on continue quand même.
    }
  }

  const pkg = findPackageById_(booking.package_id);
  if (outcome === 'restore') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1,
      available_sessions: Number(pkg.available_sessions) + 1,
    });
  } else {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1,
      used_sessions: Number(pkg.used_sessions) + 1,
    });
  }
  updateRow_(TABS.BOOKINGS, booking.rowNumber, {
    status: outcome === 'restore' ? BOOKING_STATUS.CANCELLED_AUTHORIZED : BOOKING_STATUS.NO_SHOW_OR_LATE_CANCEL,
    updated_at: new Date(),
    history_notes: `Annulation (${isInstituteInitiated ? 'institut' : 'cliente'}) — ${motif}`,
  });
  writeAuditLog_('admin', 'cancel_booking', bookingId, 'confirmed', outcome, motif);
  ui.alert(`Rendez-vous annulé. Séance : ${outcome === 'restore' ? 'restaurée' : 'considérée utilisée'}.`);
}

/**
 * Report : transfère la séance déjà réservée vers un nouveau créneau, sans
 * consommer de deuxième séance. Même booking_id conservé.
 */
function adminRescheduleBooking() {
  const ui = ui_();
  const bookingId = ui.prompt('booking_id à reporter :').getResponseText().trim();
  const booking = findRowBy_(TABS.BOOKINGS, 'booking_id', bookingId);
  if (!booking) { ui.alert('Rendez-vous introuvable.'); return; }
  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    ui.alert(`Ce rendez-vous n'est pas au statut confirmed (statut actuel : ${booking.status}).`);
    return;
  }

  const newStartRaw = ui.prompt('Nouvelle date/heure de début (AAAA-MM-JJ HH:MM) :').getResponseText().trim();
  const newStart = new Date(newStartRaw.replace(' ', 'T'));
  if (isNaN(newStart.getTime())) { ui.alert('Date invalide.'); return; }

  const durationMs = new Date(booking.end_datetime) - new Date(booking.start_datetime);
  const newEnd = new Date(newStart.getTime() + durationMs);

  if (!isSlotStillFree(newStart.toISOString(), newEnd.toISOString())) {
    ui.alert('Ce créneau n\'est pas libre.');
    return;
  }

  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  if (booking.calendar_event_id) {
    try {
      const oldEvent = calendar.getEventById(booking.calendar_event_id);
      if (oldEvent) oldEvent.deleteEvent();
    } catch (e) { /* déjà supprimé, on continue */ }
  }

  const newEvent = createCalendarEventForBooking_(
    booking.booking_id, booking.client_id, booking.service_id,
    newStart.toISOString(), newEnd.toISOString()
  );

  updateRow_(TABS.BOOKINGS, booking.rowNumber, {
    calendar_event_id: newEvent.getId(),
    start_datetime: newStart.toISOString(),
    end_datetime: newEnd.toISOString(),
    status: BOOKING_STATUS.CONFIRMED,
    updated_at: new Date(),
    history_notes: `Reporté depuis ${booking.start_datetime}`,
  });
  writeAuditLog_('admin', 'reschedule_booking', bookingId, booking.start_datetime, newStart.toISOString(), 'Report administrateur');
  ui.alert('Rendez-vous reporté, aucune séance supplémentaire consommée.');
}

function adminExtendOrSuspendPackage() {
  const ui = ui_();
  const packageId = ui.prompt('package_id concerné :').getResponseText().trim();
  const pkg = findPackageById_(packageId);
  if (!pkg) { ui.alert('Forfait introuvable.'); return; }

  const action = ui.prompt('Action : "extend" (nouvelle date d\'expiration) ou "suspend" ou "reactivate" :').getResponseText().trim();
  const motif = ui.prompt('Motif (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire.'); return; }

  if (action === 'extend') {
    const newDate = ui.prompt('Nouvelle date d\'expiration (AAAA-MM-JJ) :').getResponseText().trim();
    updateRow_(TABS.PACKAGES, pkg.rowNumber, { date_expiration: newDate });
    writeAuditLog_('admin', 'extend_package', packageId, pkg.date_expiration, newDate, motif);
  } else if (action === 'suspend') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, { statut: PACKAGE_STATUS.SUSPENDED });
    writeAuditLog_('admin', 'suspend_package', packageId, pkg.statut, PACKAGE_STATUS.SUSPENDED, motif);
  } else if (action === 'reactivate') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, { statut: PACKAGE_STATUS.ACTIVE });
    writeAuditLog_('admin', 'reactivate_package', packageId, pkg.statut, PACKAGE_STATUS.ACTIVE, motif);
  } else {
    ui.alert('Action inconnue.');
    return;
  }
  ui.alert('Forfait mis à jour.');
}
