/**
 * ============================================================================
 *  NOTIFICATIONS.gs — Confirmation post-achat, rappels de solde/expiration,
 *  alertes de renouvellement (Phase 2, Étape C).
 * ============================================================================
 *
 *  Distinction stricte, voulue dès le cadrage :
 *  - Confirmation post-achat + rappels de solde/expiration = communications
 *    TRANSACTIONNELLES sur un service déjà acheté — toujours envoyées,
 *    indépendamment de Clients.consentement_marketing.
 *  - Alerte de renouvellement : JAMAIS un email à la cliente. Seulement une
 *    ligne visible par l'administratrice (Reconciliation_Issues), à elle de
 *    décider d'agir. Si elle choisit de proposer un renouvellement, ça passe
 *    par "Proposer un forfait" (PackageOffers.gs) — jamais un envoi
 *    automatique, et ce parcours reste soumis au consentement de la cliente.
 *  - Demande d'avis (systématisation) : règle fixe et automatique (X jours
 *    après le premier rendez-vous honoré d'un forfait — délai réglable via
 *    Settings.review_request_days_after_first_session), MAIS contrairement
 *    aux communications ci-dessus, ce n'est PAS une communication
 *    transactionnelle nécessaire au service déjà acheté : c'est une demande
 *    d'action publique/commerciale, donc elle respecte
 *    Clients.consentement_marketing (hasMarketingConsent_) et ne part jamais
 *    si Settings.google_review_link est vide.
 *
 *  Dédoublonnage : chaque rappel envoyé est enregistré dans Reminders_Sent
 *  (client_id, package_id, reminder_type) — jamais renvoyé deux fois pour la
 *  même combinaison, y compris entre deux exécutions du déclencheur quotidien.
 */

function hasReminderBeenSent_(clientId, packageId, reminderType) {
  return readAllRows_(TABS.REMINDERS_SENT).some((r) =>
    r.client_id === clientId && r.package_id === packageId && r.reminder_type === reminderType
  );
}

function recordReminderSent_(clientId, packageId, reminderType) {
  appendRow_(TABS.REMINDERS_SENT, {
    reminder_id: genId_('RMD'),
    client_id: clientId,
    package_id: packageId,
    reminder_type: reminderType,
    sent_at: new Date(),
  });
}

/**
 * Confirmation post-achat — appelée depuis activatePackageIfPending_
 * (Payments.gs) au moment exact où un forfait devient actif. Dédoublonnée
 * comme les autres rappels : n'est jamais renvoyée deux fois pour le même
 * forfait, même si la fonction est appelée plusieurs fois par erreur.
 */
function sendPostPurchaseConfirmation_(packageId) {
  const pkg = findPackageById_(packageId);
  if (!pkg) return;
  if (hasReminderBeenSent_(pkg.client_id, packageId, REMINDER_TYPE.POST_ACHAT)) return;

  const client = findRowBy_(TABS.CLIENTS, 'client_id', pkg.client_id);
  if (!client || !client.email) return; // rien à envoyer si pas d'email connu

  const settings = getSettings();
  const subject = `Confirmation de votre forfait — ${pkg.nom_forfait}`;
  const body = [
    `Bonjour ${client.prenom || ''},`,
    '',
    `Votre forfait "${pkg.nom_forfait}" est maintenant actif.`,
    '',
    `Séances achetées : ${pkg.total_sessions}`,
    pkg.date_expiration
      ? `Durée de validité : jusqu'au ${formatDateForReport_(pkg.date_expiration)}`
      : `Durée de validité : aucune limite`,
    '',
    `Pour réserver vos séances : ${settings.site_base_url}/use-package`,
    '',
    `Règle d'annulation : une annulation effectuée moins de ${settings.cancellation_deadline_hours}h ` +
      `avant le rendez-vous est considérée comme une séance utilisée, sauf accord exceptionnel de notre part.`,
    '',
    'Elysian Paris',
  ].join('\n');

  MailApp.sendEmail(client.email, subject, body);
  recordReminderSent_(pkg.client_id, packageId, REMINDER_TYPE.POST_ACHAT);
  writeAuditLog_('system', 'send_post_purchase_confirmation', packageId, '', 'sent', '');
}

function sendBalanceReminderEmail_(client, pkg, sessionsRemaining, settings) {
  const subject = sessionsRemaining > 0
    ? `Il vous reste ${sessionsRemaining} séance(s) — ${pkg.nom_forfait}`
    : `Votre forfait ${pkg.nom_forfait} est entièrement utilisé`;
  const body = [
    `Bonjour ${client.prenom || ''},`,
    '',
    sessionsRemaining > 0
      ? `Il vous reste ${sessionsRemaining} séance(s) sur votre forfait "${pkg.nom_forfait}".`
      : `Vous avez utilisé toutes les séances de votre forfait "${pkg.nom_forfait}".`,
    '',
    `Pour réserver : ${settings.site_base_url}/use-package`,
    '',
    'Elysian Paris',
  ].join('\n');
  MailApp.sendEmail(client.email, subject, body);
}

/**
 * Seul endroit qui décide ce que "consentement marketing" veut dire — pour
 * que toute future communication discrétionnaire (demande d'avis, et plus
 * tard d'éventuelles offres commerciales) applique exactement la même règle.
 */
function hasMarketingConsent_(client) {
  const raw = String((client && client.consentement_marketing) || '').trim().toLowerCase();
  return ['oui', 'yes', 'true', '1'].indexOf(raw) !== -1;
}

/** Date du premier rendez-vous honoré (confirmé ou marqué utilisé) d'un forfait, ou null si aucun. */
function findFirstSessionDate_(packageId) {
  const dates = readAllRows_(TABS.BOOKINGS)
    .filter((b) => b.package_id === packageId &&
      (b.status === BOOKING_STATUS.CONFIRMED || b.status === BOOKING_STATUS.NO_SHOW_OR_LATE_CANCEL))
    .map((b) => new Date(b.start_datetime))
    .filter((d) => !isNaN(d.getTime()));
  return dates.length ? new Date(Math.min.apply(null, dates)) : null;
}

function sendReviewRequestEmail_(client, pkg, settings) {
  const subject = 'Un instant pour partager votre expérience chez Elysian Paris ?';
  const body = [
    `Bonjour ${client.prenom || ''},`,
    '',
    `Nous espérons que votre séance chez Elysian Paris vous a plu.`,
    `Votre avis compte énormément pour nous — auriez-vous deux minutes pour le partager ?`,
    '',
    settings.google_review_link,
    '',
    'Merci beaucoup,',
    'Elysian Paris',
  ].join('\n');
  MailApp.sendEmail(client.email, subject, body);
}

function sendAppointmentReminderEmail_(client, booking, settings) {
  const subject = 'Rappel : votre rendez-vous chez Elysian Paris';
  const body = [
    `Bonjour ${client.prenom || ''},`,
    '',
    `Petit rappel de votre rendez-vous demain :`,
    `${booking.service_id} — ${formatDateForReport_(booking.start_datetime)}`,
    '',
    `Notre studio : 61 Kensington Church Street, London W8 4BA.`,
    '',
    `Règle d'annulation : une annulation effectuée moins de ${settings.cancellation_deadline_hours}h ` +
      `avant le rendez-vous est considérée comme une séance utilisée, sauf accord exceptionnel de notre part.`,
    '',
    'À très vite,',
    'Elysian Paris',
  ].join('\n');
  MailApp.sendEmail(client.email, subject, body);
}

function sendExpirationReminderEmail_(client, pkg, daysBefore, settings) {
  const subject = `Votre forfait ${pkg.nom_forfait} expire dans ${daysBefore} jours`;
  const body = [
    `Bonjour ${client.prenom || ''},`,
    '',
    `Votre forfait "${pkg.nom_forfait}" expire le ${formatDateForReport_(pkg.date_expiration)}.`,
    `Il vous reste ${pkg.available_sessions} séance(s) disponible(s).`,
    '',
    `Pour réserver : ${settings.site_base_url}/use-package`,
    '',
    'Elysian Paris',
  ].join('\n');
  MailApp.sendEmail(client.email, subject, body);
}

/**
 * Rappel de rendez-vous, envoyé une fois pour chaque réservation forfait
 * confirmée dont le début tombe dans la fenêtre reminder_hours_before_appointment
 * (24h par défaut). Dédoublonné par booking_id (REMINDER_TYPE.appointmentReminder),
 * donc sûr à exécuter plusieurs fois sans jamais renvoyer deux fois le même
 * rappel — contrairement à runDailyNotifications (une fois par jour suffit
 * pour des rappels de solde/expiration), celui-ci a besoin d'un déclencheur
 * HORAIRE pour rester proche de la fenêtre annoncée (voir README).
 * Communication transactionnelle liée à un rendez-vous déjà pris : envoyée
 * indépendamment du consentement marketing, comme la confirmation d'achat.
 */
function runAppointmentReminders_() {
  const settings = getSettings();
  const hoursBefore = Number(settings.reminder_hours_before_appointment);
  if (!hoursBefore || hoursBefore <= 0) return 0;

  const now = new Date();
  let actionsCount = 0;

  readAllRows_(TABS.BOOKINGS)
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED)
    .forEach((booking) => {
      const start = new Date(booking.start_datetime);
      if (isNaN(start.getTime())) return;
      const hoursUntilStart = (start.getTime() - now.getTime()) / (60 * 60 * 1000);
      if (hoursUntilStart <= 0 || hoursUntilStart > hoursBefore) return;

      const type = REMINDER_TYPE.appointmentReminder(booking.booking_id);
      if (hasReminderBeenSent_(booking.client_id, booking.package_id, type)) return;

      const client = findRowBy_(TABS.CLIENTS, 'client_id', booking.client_id);
      if (!client || !client.email) return;

      sendAppointmentReminderEmail_(client, booking, settings);
      recordReminderSent_(booking.client_id, booking.package_id, type);
      actionsCount++;
    });

  Logger.log(`Rappels de rendez-vous : ${actionsCount} envoyé(s).`);
  return actionsCount;
}

/**
 * Notifie (une seule fois chacune) les clientes en liste d'attente pour ce
 * soin qu'un créneau vient de se libérer. Jamais une réservation
 * automatique : la cliente doit repasser par /use-package pour choisir et
 * confirmer elle-même un créneau, premier arrivé premier servi. Appelée
 * depuis AdminMenu.gs → cancelBooking_, juste après suppression de
 * l'événement Calendar (le moment exact où le créneau redevient libre).
 */
function notifyMatchingWaitlist_(serviceId) {
  const settings = getSettings();
  const entries = readAllRows_(TABS.WAITLIST).filter((w) =>
    w.service_id === serviceId && w.statut === WAITLIST_STATUS.ACTIVE
  );

  entries.forEach((entry) => {
    const client = findRowBy_(TABS.CLIENTS, 'client_id', entry.client_id);
    if (!client || !client.email) return;

    const subject = 'Un créneau vient de se libérer chez Elysian Paris';
    const body = [
      `Bonjour ${client.prenom || ''},`,
      '',
      `Un créneau vient de se libérer pour le soin que vous attendiez.`,
      `Réservez-le dès maintenant, au premier arrivé : ${settings.site_base_url}/use-package`,
      '',
      'Elysian Paris',
    ].join('\n');
    MailApp.sendEmail(client.email, subject, body);

    updateRow_(TABS.WAITLIST, entry.rowNumber, {
      statut: WAITLIST_STATUS.NOTIFIED,
      notified_at: new Date(),
    });
  });

  return entries.length;
}

/**
 * Fonction quotidienne (déclencheur horaire à ajouter manuellement, voir
 * README — même principe que runReconciliationCheck) : rappels de solde,
 * rappels d'expiration, et alertes de renouvellement pour l'administratrice.
 */
function runDailyNotifications() {
  const settings = getSettings();
  const balanceThresholds = String(settings.reminder_low_balance_thresholds)
    .split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
  const expirationDaysList = String(settings.reminder_days_before_expiration)
    .split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
  const renewalWindowDays = expirationDaysList.length ? Math.min.apply(null, expirationDaysList) : 7;

  const packages = readAllRows_(TABS.PACKAGES).filter((p) => p.statut === PACKAGE_STATUS.ACTIVE);
  const now = new Date();
  let actionsCount = 0;

  packages.forEach((pkg) => {
    const client = findRowBy_(TABS.CLIENTS, 'client_id', pkg.client_id);
    const available = Number(pkg.available_sessions);

    let daysUntilExpiration = null;
    if (pkg.date_expiration) {
      const exp = new Date(pkg.date_expiration);
      if (!isNaN(exp.getTime())) {
        daysUntilExpiration = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      }
    }

    if (client && client.email) {
      // --- Rappels de solde ---
      balanceThresholds.forEach((threshold) => {
        if (available !== threshold) return;
        const type = REMINDER_TYPE.balance(threshold);
        if (hasReminderBeenSent_(pkg.client_id, pkg.package_id, type)) return;
        sendBalanceReminderEmail_(client, pkg, threshold, settings);
        recordReminderSent_(pkg.client_id, pkg.package_id, type);
        actionsCount++;
      });

      // --- Rappels d'expiration ---
      if (daysUntilExpiration !== null) {
        expirationDaysList.forEach((days) => {
          if (daysUntilExpiration !== days) return;
          const type = REMINDER_TYPE.expiration(days);
          if (hasReminderBeenSent_(pkg.client_id, pkg.package_id, type)) return;
          sendExpirationReminderEmail_(client, pkg, days, settings);
          recordReminderSent_(pkg.client_id, pkg.package_id, type);
          actionsCount++;
        });
      }
    }

    // --- Alerte de renouvellement : jamais un email, uniquement une ligne
    // pour l'administratrice. Une seule fois par forfait (pas de répétition
    // quotidienne du même signal une fois qu'il a été levé). ---
    const nearCompletion = available <= 1;
    const nearExpiration = daysUntilExpiration !== null && daysUntilExpiration <= renewalWindowDays;
    if ((nearCompletion || nearExpiration) && !hasReminderBeenSent_(pkg.client_id, pkg.package_id, REMINDER_TYPE.RENEWAL_ALERT)) {
      appendRow_(TABS.RECONCILIATION_ISSUES, {
        timestamp_detection: new Date(),
        type_anomalie: 'renewal_opportunity',
        entite_concernee: pkg.package_id,
        details: `Forfait bientôt terminé (disponibles=${available}) ou proche expiration ` +
          `(${daysUntilExpiration !== null ? daysUntilExpiration + ' jours' : 'sans date'}) — ` +
          `décision de renouvellement à prendre manuellement. Consentement marketing : ` +
          `${client ? (client.consentement_marketing || 'non renseigné') : 'cliente introuvable'}.`,
        statut: 'a_verifier',
        resolution_notes: '',
      });
      recordReminderSent_(pkg.client_id, pkg.package_id, REMINDER_TYPE.RENEWAL_ALERT);
      actionsCount++;
    }
  });

  // --- Demandes d'avis : règle fixe, une seule fois par forfait, X jours
  // après le premier rendez-vous honoré (tous statuts de forfait confondus,
  // pas seulement "active" — une cliente dont le forfait est terminé mérite
  // aussi qu'on lui demande son avis). Discrétionnaire, donc respecte le
  // consentement marketing et ne part jamais sans lien configuré. ---
  if (settings.google_review_link) {
    const reviewDelayDays = Number(settings.review_request_days_after_first_session) || 7;
    readAllRows_(TABS.PACKAGES).forEach((pkg) => {
      if (hasReminderBeenSent_(pkg.client_id, pkg.package_id, REMINDER_TYPE.REVIEW_REQUEST)) return;

      const client = findRowBy_(TABS.CLIENTS, 'client_id', pkg.client_id);
      if (!client || !client.email || !hasMarketingConsent_(client)) return;

      const firstSession = findFirstSessionDate_(pkg.package_id);
      if (!firstSession) return;
      const daysSinceFirstSession = (now.getTime() - firstSession.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceFirstSession < reviewDelayDays) return;

      sendReviewRequestEmail_(client, pkg, settings);
      recordReminderSent_(pkg.client_id, pkg.package_id, REMINDER_TYPE.REVIEW_REQUEST);
      actionsCount++;
    });
  }

  Logger.log(`Notifications quotidiennes : ${actionsCount} action(s) effectuée(s).`);
  return actionsCount;
}
