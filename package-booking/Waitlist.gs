/**
 * ============================================================================
 *  WAITLIST.gs — Liste d'attente quand aucun créneau n'est libre.
 * ============================================================================
 *
 *  Rejoindre la liste d'attente n'est PAS une réservation : aucune séance
 *  n'est déduite, aucun créneau n'est retenu. C'est juste une demande d'être
 *  prévenue. La notification (Notifications.gs → notifyMatchingWaitlist_,
 *  appelée depuis AdminMenu.gs → cancelBooking_ dès qu'un créneau se libère)
 *  renvoie simplement la cliente vers /use-package pour réserver elle-même,
 *  premier arrivée première servie — jamais d'attribution automatique.
 */

/**
 * Parcours PUBLIC (site) — appelé depuis WebApp.gs quand /use-package
 * n'affiche aucun créneau pour le soin choisi.
 */
function joinPackageWaitlist_(sessionTokenPlain, serviceId) {
  if (!sessionTokenPlain || !serviceId) {
    throw new BookingBusinessError_('Requête incomplète.');
  }

  const tokenHash = hashWithPepper_(sessionTokenPlain);
  const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    throw new BookingBusinessError_('Session invalide ou expirée, merci de recommencer la vérification.');
  }

  const pkg = findPackageById_(tokenRow.package_id);
  if (!pkg || pkg.statut !== PACKAGE_STATUS.ACTIVE) {
    throw new BookingBusinessError_('Ce forfait n\'est pas actif.');
  }
  const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
  if (included.indexOf(serviceId) === -1) {
    throw new BookingBusinessError_('Ce soin n\'est pas inclus dans ce forfait.');
  }

  // Jamais deux entrées actives pour le même (client, soin) — pas de
  // notification en double à chaque libération de créneau.
  const alreadyOnList = readAllRows_(TABS.WAITLIST).some((w) =>
    w.client_id === tokenRow.client_id && w.service_id === serviceId && w.statut === WAITLIST_STATUS.ACTIVE
  );
  if (alreadyOnList) {
    return { status: 'already_on_waitlist' };
  }

  appendRow_(TABS.WAITLIST, {
    waitlist_id: genId_('WTL'),
    client_id: tokenRow.client_id,
    package_id: tokenRow.package_id,
    service_id: serviceId,
    statut: WAITLIST_STATUS.ACTIVE,
    created_at: new Date(),
    notified_at: '',
  });
  writeAuditLog_(tokenRow.client_id, 'join_waitlist', serviceId, '', WAITLIST_STATUS.ACTIVE, '');

  // Ne bloque jamais la demande de la cliente si l'email à l'administratrice échoue.
  try {
    notifyAdminOfNewWaitlistEntry_(serviceId, findRowBy_(TABS.CLIENTS, 'client_id', tokenRow.client_id));
  } catch (e) {
    // Rien de plus à faire : l'inscription elle-même a déjà réussi ci-dessus.
  }

  return { status: 'joined' };
}

/**
 * Prévient l'administratrice (le compte propriétaire du script, celui sous
 * lequel la Web App s'exécute — "Exécuter en tant que : Moi" au déploiement)
 * dès qu'une cliente rejoint la liste d'attente, pour ne pas avoir à
 * surveiller l'onglet Waitlist manuellement.
 */
function notifyAdminOfNewWaitlistEntry_(serviceId, client) {
  const adminEmail = Session.getEffectiveUser().getEmail();
  if (!adminEmail) return;

  const clientLabel = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() || client.email : 'Une cliente';
  const subject = `Liste d'attente : ${clientLabel} attend un créneau (${serviceId})`;
  const body = [
    `${clientLabel} vient de rejoindre la liste d'attente pour : ${serviceId}.`,
    '',
    `Elle sera prévenue automatiquement dès qu'un rendez-vous confirmé pour ce soin sera annulé.`,
    `Détail dans l'onglet Waitlist du Sheet.`,
  ].join('\n');
  MailApp.sendEmail(adminEmail, subject, body);
}
