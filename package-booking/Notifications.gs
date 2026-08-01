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

  Logger.log(`Notifications quotidiennes : ${actionsCount} action(s) effectuée(s).`);
  return actionsCount;
}
