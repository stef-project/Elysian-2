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
  return { status: 'joined' };
}
