/**
 * ============================================================================
 *  PORTAL.gs — Portail web : vue cliente ("où en suis-je ?") et vue admin
 *  ("où en sont toutes mes clientes ?"), au lieu d'ouvrir le Sheet à la main.
 * ============================================================================
 *
 *  Authentification admin volontairement simple (mot de passe unique,
 *  jamais stocké en clair) : un seul compte, pas de rôles, pas de jeton de
 *  session à gérer — chaque appel admin renvoie le mot de passe, vérifié
 *  côté serveur à chaque fois. Protégé par le même anti brute-force que le
 *  reste du site (Security.gs).
 */

/** Renvoie le hash du mot de passe admin, ou null si jamais configuré (voir AdminMenu.gs → adminSetPortalPassword). */
function getAdminPasswordHash_() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PORTAL_PASSWORD_HASH') || null;
}

/**
 * Définit (ou change) le mot de passe du portail admin — jamais stocké en
 * clair, seulement son hash HMAC (même primitive que les codes/jetons,
 * Security.gs). À lancer depuis le menu Sheet, une seule fois pour
 * initialiser, ou à nouveau pour changer le mot de passe.
 */
function adminSetPortalPassword() {
  const ui = ui_();
  const response = ui.prompt('Nouveau mot de passe du portail admin (8 caractères minimum) :');
  const password = response.getResponseText().trim();
  if (password.length < 8) {
    ui.alert('Mot de passe trop court — inchangé (8 caractères minimum).');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('ADMIN_PORTAL_PASSWORD_HASH', hashWithPepper_(password));
  writeAuditLog_('admin', 'set_portal_password', 'admin_portal', '', '', '');
  ui.alert('Mot de passe du portail admin mis à jour.');
}

/**
 * Vérifie le mot de passe admin. Lève une erreur générique (jamais de détail
 * sur la cause) en cas d'échec, de blocage anti brute-force, ou si aucun mot
 * de passe n'a encore été configuré.
 */
function authenticateAdmin_(passwordPlain) {
  const settings = getSettings();
  enforceNotLockedOutForAdmin_(settings);

  const storedHash = getAdminPasswordHash_();
  const providedHash = passwordPlain ? hashWithPepper_(String(passwordPlain)) : '';

  if (!storedHash || !passwordPlain || providedHash !== storedHash) {
    recordFailedAdminAttempt_(settings);
    throw new BookingBusinessError_('Mot de passe incorrect.');
  }
  clearFailedAdminAttempts_();
}

/**
 * Un code promo est-il encore utilisable à cet instant (actif, non expiré,
 * quota non épuisé) ? Mêmes conditions que validatePromoCodeForClient_
 * (PromoCodes.gs), en lecture seule ici — la restriction par cliente
 * (client_id) se vérifie séparément, selon le contexte d'appel.
 */
function isPromoCodeCurrentlyAvailable_(p, now) {
  if (p.statut !== PROMO_CODE_STATUS.ACTIVE) return false;
  if (p.date_expiration) {
    const exp = new Date(p.date_expiration);
    if (!isNaN(exp.getTime()) && exp < now) return false;
  }
  const usageMax = Number(p.usage_max) || 1;
  const usageCount = Number(p.usage_count) || 0;
  if (usageCount >= usageMax) return false;
  return true;
}

/** Forme renvoyée au site pour un code promo (jamais la ligne brute du Sheet). */
function promoCodeToDto_(p) {
  return {
    code: p.code,
    discountType: p.type,
    discountValue: Number(p.value),
  };
}

/**
 * Codes promo actifs et disponibles pour une cliente donnée : réservés à
 * elle (client_id correspondant) ou génériques (client_id vide), actifs, non
 * expirés et pas encore épuisés. Utilisé par le tableau de bord /use-package
 * (une seule cliente à la fois).
 */
function findActivePromoCodesForClient_(clientId) {
  const now = new Date();
  return readAllRows_(TABS.PROMO_CODES)
    .filter((p) => isPromoCodeCurrentlyAvailable_(p, now))
    .filter((p) => !p.client_id || p.client_id === clientId)
    .map(promoCodeToDto_);
}

/**
 * Vue d'ensemble admin : chaque cliente, ses forfaits actifs, ses rendez-vous
 * à venir et les codes promo qui lui sont applicables.
 *
 * Les rendez-vous listés ici sont exactement ceux du Sheet (onglet Bookings) :
 * les réservations forfait confirmées (qui ont TOUJOURS leur événement Google
 * Calendar créé au moment de la confirmation — le portail n'est qu'une vue
 * supplémentaire, jamais une source concurrente du calendrier) et les
 * réservations externes saisies manuellement (ClassPass / WhatsApp,
 * external_manual — purement déclaratives, sans événement Calendar).
 */
function adminGetClientsOverview_(passwordPlain) {
  authenticateAdmin_(passwordPlain);

  // Forfaits actifs ET en attente de paiement — les pending_payment sont
  // affichés avec leur statut pour permettre la relance, sans jamais être
  // réservables (findEligiblePackages_/confirmPackageBooking exigent ACTIVE).
  const packagesByClient = {};
  readAllRows_(TABS.PACKAGES).forEach((pkg) => {
    if ([PACKAGE_STATUS.ACTIVE, PACKAGE_STATUS.PENDING_PAYMENT].indexOf(pkg.statut) === -1) return;
    (packagesByClient[pkg.client_id] = packagesByClient[pkg.client_id] || []).push({
      packageName: pkg.nom_forfait,
      availableSessions: Number(pkg.available_sessions),
      totalSessions: Number(pkg.total_sessions),
      dateExpiration: pkg.date_expiration || '',
      statut: pkg.statut,
    });
  });

  const now = new Date();
  const bookingsByClient = {};
  readAllRows_(TABS.BOOKINGS).forEach((b) => {
    if ([BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EXTERNAL_MANUAL].indexOf(b.status) === -1) return;
    if (!(new Date(b.start_datetime) > now)) return;
    (bookingsByClient[b.client_id] = bookingsByClient[b.client_id] || []).push({
      serviceId: b.service_id,
      start: b.start_datetime,
      end: b.end_datetime,
      source: b.source || '',
      status: b.status,
    });
  });
  Object.keys(bookingsByClient).forEach((clientId) => {
    bookingsByClient[clientId].sort((a, b) => new Date(a.start) - new Date(b.start));
  });

  // Une seule lecture de Promo_Codes pour toute la vue — surtout pas
  // findActivePromoCodesForClient_ par cliente, qui relirait l'onglet entier
  // à chaque itération (N clientes = N lectures, lent et coûteux en quota).
  const availablePromos = readAllRows_(TABS.PROMO_CODES)
    .filter((p) => isPromoCodeCurrentlyAvailable_(p, now));

  // Paiements (la vue "commandes") par cliente — plus récents d'abord, avec
  // total net confirmé, pour suivre les achats sans ouvrir le Sheet. Les
  // montants ne sont visibles qu'ici, derrière le mot de passe admin —
  // jamais dans le tableau de bord cliente /use-package.
  const paymentsByClient = {};
  const totalNetByClient = {};
  readAllRows_(TABS.PAYMENTS).forEach((p) => {
    (paymentsByClient[p.client_id] = paymentsByClient[p.client_id] || []).push({
      date: p.date_paiement,
      montantBrut: Number(p.montant_brut) || 0,
      montantNet: Number(p.montant_net) || 0,
      devise: p.devise || 'GBP',
      moyen: p.moyen_paiement,
      statut: p.statut_paiement,
      packageId: p.package_id,
    });
    if (p.statut_paiement === PAYMENT_STATUS.CONFIRME) {
      totalNetByClient[p.client_id] = (totalNetByClient[p.client_id] || 0) + (Number(p.montant_net) || 0);
    }
  });
  Object.keys(paymentsByClient).forEach((cid) => {
    paymentsByClient[cid].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  return readAllRows_(TABS.CLIENTS).map((c) => ({
    clientId: c.client_id,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone,
    packages: packagesByClient[c.client_id] || [],
    upcomingBookings: bookingsByClient[c.client_id] || [],
    // Les 5 paiements les plus récents suffisent pour la vue d'ensemble —
    // l'historique complet reste dans la Fiche_Client (menu Sheet).
    payments: (paymentsByClient[c.client_id] || []).slice(0, 5),
    totalNetConfirmed: Number((totalNetByClient[c.client_id] || 0).toFixed(2)),
    activePromoCodes: availablePromos
      .filter((p) => !p.client_id || p.client_id === c.client_id)
      .map(promoCodeToDto_),
  }));
}

/**
 * Création d'un code promo depuis le portail admin web — la seule écriture
 * autorisée du portail (tout le reste reste en lecture seule). Même mot de
 * passe + anti brute-force que la vue d'ensemble, et exactement le même cœur
 * de création/validation que le menu Sheet (createPromoCode_, PromoCodes.gs)
 * — rien n'est dupliqué, tout est tracé dans Audit_Log (acteur
 * "admin_portal" pour distinguer l'origine).
 *
 * params : { clientEmail (optionnel — vide = code générique), code (optionnel
 * — vide = généré automatiquement), discountType, discountValue, usageMax
 * (optionnel, défaut 1), validityDays (optionnel), note (optionnel) }.
 */
function adminPortalCreatePromoCode_(passwordPlain, params) {
  authenticateAdmin_(passwordPlain);

  let clientId = '';
  const clientEmail = String((params && params.clientEmail) || '').trim().toLowerCase();
  if (clientEmail) {
    const client = findClientByEmail_(clientEmail);
    if (!client) throw new BookingBusinessError_('Aucune cliente avec cet email.');
    clientId = client.client_id;
  }

  const validityDays = Number((params && params.validityDays) || 0);
  const dateExpiration = validityDays > 0
    ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
    : '';

  const code = String((params && params.code) || '').trim().toUpperCase() || generateUniquePromoCode_('PROMO');

  createPromoCode_({
    code: code,
    clientId: clientId,
    type: (params && params.discountType) || '',
    value: (params && params.discountValue),
    usageMax: Number((params && params.usageMax) || 1),
    dateExpiration: dateExpiration,
    notesAdmin: String((params && params.note) || '').trim() || 'Créé depuis le portail admin web',
    actor: 'admin_portal',
  });

  return { code: code, clientId: clientId };
}

/**
 * Annulation d'un code promo depuis le portail admin web — même protection
 * que la création (mot de passe + anti brute-force), même cœur que le menu
 * Sheet (cancelPromoCodeByCode_, PromoCodes.gs), tracée dans Audit_Log
 * (acteur "admin_portal"). ⚠️ Un code générique annulé ici l'est pour
 * toutes les clientes — le frontend demande confirmation avant l'appel.
 */
function adminPortalCancelPromoCode_(passwordPlain, params) {
  authenticateAdmin_(passwordPlain);

  const code = String((params && params.code) || '').trim();
  if (!code) throw new BookingBusinessError_('Code manquant.');
  cancelPromoCodeByCode_(code, 'admin_portal');
  return { code: code.toUpperCase() };
}
