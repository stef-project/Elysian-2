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
 * Normalise un statut lu dans le Sheet pour comparaison (espaces parasites,
 * casse) — une cellule retouchée à la main ("Active ", "ACTIVE") ne doit
 * jamais faire disparaître silencieusement une ligne du portail.
 */
function normStatus_(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Un code promo est-il encore utilisable à cet instant (actif, non expiré,
 * quota non épuisé) ? Mêmes conditions que validatePromoCodeForClient_
 * (PromoCodes.gs), en lecture seule ici — la restriction par cliente
 * (client_id) se vérifie séparément, selon le contexte d'appel.
 */
function isPromoCodeCurrentlyAvailable_(p, now) {
  if (normStatus_(p.statut) !== PROMO_CODE_STATUS.ACTIVE) return false;
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
    const statut = normStatus_(pkg.statut);
    if ([PACKAGE_STATUS.ACTIVE, PACKAGE_STATUS.PENDING_PAYMENT].indexOf(statut) === -1) return;
    const cid = String(pkg.client_id || '').trim();
    (packagesByClient[cid] = packagesByClient[cid] || []).push({
      packageName: pkg.nom_forfait,
      availableSessions: Number(pkg.available_sessions),
      totalSessions: Number(pkg.total_sessions),
      dateExpiration: pkg.date_expiration || '',
      statut: statut,
    });
  });

  const now = new Date();
  const bookingsByClient = {};
  readAllRows_(TABS.BOOKINGS).forEach((b) => {
    if ([BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.EXTERNAL_MANUAL].indexOf(normStatus_(b.status)) === -1) return;
    if (!(new Date(b.start_datetime) > now)) return;
    (bookingsByClient[String(b.client_id || '').trim()] = bookingsByClient[String(b.client_id || '').trim()] || []).push({
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
  // total net confirmé. Les montants ne sont visibles qu'ici, derrière le
  // mot de passe admin — jamais dans le tableau de bord cliente /use-package.
  // NB : seuls les paiements enregistrés dans le système apparaissent — les
  // paiements Stripe des Appointment Schedules (Workspace) restent hors
  // système, aucune API de paiement n'étant intégrée.
  const paymentsByClient = {};
  const totalNetByClient = {};
  readAllRows_(TABS.PAYMENTS).forEach((p) => {
    const cid = String(p.client_id || '').trim();
    (paymentsByClient[cid] = paymentsByClient[cid] || []).push({
      date: p.date_paiement,
      montantBrut: Number(p.montant_brut) || 0,
      montantNet: Number(p.montant_net) || 0,
      devise: p.devise || 'GBP',
      moyen: p.moyen_paiement,
      statut: normStatus_(p.statut_paiement),
      packageId: p.package_id,
    });
    if (normStatus_(p.statut_paiement) === PAYMENT_STATUS.CONFIRME) {
      totalNetByClient[cid] = (totalNetByClient[cid] || 0) + (Number(p.montant_net) || 0);
    }
  });
  Object.keys(paymentsByClient).forEach((cid) => {
    paymentsByClient[cid].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  return readAllRows_(TABS.CLIENTS).map((c) => {
    const cid = String(c.client_id || '').trim();
    return {
      clientId: c.client_id,
      prenom: c.prenom,
      nom: c.nom,
      email: c.email,
      telephone: c.telephone,
      packages: packagesByClient[cid] || [],
      upcomingBookings: bookingsByClient[cid] || [],
      // Les 5 paiements les plus récents suffisent pour la vue d'ensemble —
      // l'historique complet reste dans la Fiche_Client (menu Sheet).
      payments: (paymentsByClient[cid] || []).slice(0, 5),
      totalNetConfirmed: Number((totalNetByClient[cid] || 0).toFixed(2)),
      activePromoCodes: availablePromos
        .filter((p) => !p.client_id || String(p.client_id).trim() === cid)
        .map(promoCodeToDto_),
    };
  });
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

/**
 * Création d'une cliente depuis le portail admin — pour enregistrer une
 * nouvelle cliente sans ouvrir le Sheet. Mêmes protections que les autres
 * écritures du portail (mot de passe + anti brute-force, Audit_Log). Le
 * parrainage reste côté menu Sheet (recherche interactive de la marraine) —
 * non exposé ici.
 */
function adminPortalAddClient_(passwordPlain, params) {
  authenticateAdmin_(passwordPlain);

  const prenom = String((params && params.prenom) || '').trim();
  const nom = String((params && params.nom) || '').trim();
  const email = String((params && params.email) || '').trim().toLowerCase();
  const telephone = String((params && params.telephone) || '').trim();

  if (!prenom) throw new BookingBusinessError_('Prénom manquant.');
  if (!email || email.indexOf('@') === -1) throw new BookingBusinessError_('Email invalide.');

  // Unicité + écriture sous verrou — sans lui, un double-clic ou un retry
  // réseau (requête échouée côté navigateur mais exécutée côté serveur)
  // ferait passer deux fois le check avant la première écriture : cliente
  // en double. Même principe que createPromoCode_.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');
  }
  try {
    if (findClientByEmail_(email)) throw new BookingBusinessError_('Une cliente avec cet email existe déjà.');

    const clientId = genId_('CLI');
    appendRow_(TABS.CLIENTS, {
      client_id: clientId,
      prenom: prenom,
      nom: nom,
      email: email,
      telephone: telephone,
      notes_admin: '',
      date_creation: new Date(),
      tags: '',
    });
    writeAuditLog_('admin_portal', 'add_client', clientId, '', email, 'Créée via le portail admin');
    return { clientId: clientId };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Attribution d'un forfait depuis le portail admin. Par choix de
 * l'administratrice, le portail ne gère AUCUN paiement (suivi séparé, hors
 * système) : le forfait est créé directement ACTIF — donc réservable
 * immédiatement, avec événement Google Calendar créé à chaque réservation
 * confirmée — accompagné d'une ligne Payments neutre (0, moyen "other")
 * pour respecter l'invariant "aucun forfait actif sans trace de paiement"
 * (même principe que grantComplimentaryPackage_, Payments.gs). Si le montant
 * réel doit un jour être suivi, il se saisit via le menu Sheet → Paiements.
 * Aucun email automatique n'est envoyé à la cliente.
 *
 * "Séances restantes" optionnel (défaut = total) : permet d'enregistrer une
 * cliente existante dont le forfait est déjà entamé — used_sessions est posé
 * à total - restantes pour que la réconciliation (total = dispo + réservées
 * + utilisées) reste juste.
 */
function adminPortalAddPackage_(passwordPlain, params) {
  authenticateAdmin_(passwordPlain);

  const clientEmail = String((params && params.clientEmail) || '').trim().toLowerCase();
  const client = findClientByEmail_(clientEmail);
  if (!client) throw new BookingBusinessError_('Aucune cliente avec cet email.');

  const packageName = String((params && params.packageName) || '').trim();
  if (!packageName) throw new BookingBusinessError_('Nom du forfait manquant.');

  const services = (Array.isArray(params && params.servicesIncluded) ? params.servicesIncluded : [])
    .map((s) => String(s || '').trim())
    .filter((s) => s.length > 0);
  if (services.length === 0) throw new BookingBusinessError_('Sélectionne au moins un soin inclus.');

  const totalSessions = parseInt((params && params.totalSessions), 10);
  if (isNaN(totalSessions) || totalSessions < 1) throw new BookingBusinessError_('Nombre de séances invalide.');

  const availableRaw = params && params.availableSessions;
  const availableSessions = (availableRaw === undefined || availableRaw === null || availableRaw === '')
    ? totalSessions
    : parseInt(availableRaw, 10);
  if (isNaN(availableSessions) || availableSessions < 0 || availableSessions > totalSessions) {
    throw new BookingBusinessError_('Séances restantes invalides (entre 0 et le total).');
  }

  let dateExpiration = '';
  const expirationRaw = String((params && params.expirationDate) || '').trim();
  if (expirationRaw) {
    const exp = new Date(expirationRaw);
    if (isNaN(exp.getTime())) throw new BookingBusinessError_('Date d\'expiration invalide.');
    dateExpiration = expirationRaw;
  }

  // Montant payé OPTIONNEL : renseigné → le paiement est enregistré avec le
  // vrai montant (le CA du tableau de bord reste juste) ; vide → trace
  // neutre à 0, paiement suivi hors système (comportement d'origine).
  const amountRaw = params && params.amountPaid;
  const amountPaid = (amountRaw === undefined || amountRaw === null || amountRaw === '')
    ? null
    : parseFloat(amountRaw);
  if (amountPaid !== null && (isNaN(amountPaid) || amountPaid < 0)) {
    throw new BookingBusinessError_('Montant payé invalide.');
  }
  const paymentMethod = String((params && params.paymentMethod) || '').trim().toLowerCase() || PAYMENT_METHOD.OTHER;
  if (Object.values(PAYMENT_METHOD).indexOf(paymentMethod) === -1) {
    throw new BookingBusinessError_('Moyen de paiement invalide.');
  }

  // Écriture sous verrou, avec rejet des re-soumissions : un forfait n'a pas
  // de clé naturelle d'unicité, donc un double-clic ou un retry réseau
  // (requête échouée côté navigateur mais exécutée côté serveur) créerait
  // deux forfaits identiques + deux lignes Payments. Même cliente + même nom
  // + même total créés il y a moins de 2 minutes = re-soumission, refusée.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');
  }
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const duplicate = readAllRows_(TABS.PACKAGES).find((p) =>
      String(p.client_id).trim() === client.client_id &&
      String(p.nom_forfait).trim().toLowerCase() === packageName.toLowerCase() &&
      Number(p.total_sessions) === totalSessions &&
      new Date(p.date_achat) > twoMinutesAgo
    );
    if (duplicate) {
      throw new BookingBusinessError_(
        `Un forfait identique vient d'être créé pour cette cliente (${duplicate.package_id}) — probable double-clic, rien n'a été recréé.`
      );
    }

    const packageId = genId_('PKG');
    appendRow_(TABS.PACKAGES, {
      package_id: packageId,
      client_id: client.client_id,
      nom_forfait: packageName,
      soins_inclus: services.join(', '),
      total_sessions: totalSessions,
      available_sessions: availableSessions,
      reserved_sessions: 0,
      used_sessions: totalSessions - availableSessions,
      date_achat: new Date(),
      date_expiration: dateExpiration,
      moyen_paiement: '',
      statut: PACKAGE_STATUS.ACTIVE,
      notes_admin: 'Enregistré via le portail admin — paiement suivi hors système',
      package_template_id: '',
    });

    const paymentId = genId_('PAY');
    const montantBrut = amountPaid !== null ? amountPaid : 0;
    const financials = computePaymentFinancials_(montantBrut, 0);
    appendRow_(TABS.PAYMENTS, {
      payment_id: paymentId,
      client_id: client.client_id,
      package_id: packageId,
      montant_brut: montantBrut,
      devise: 'GBP',
      moyen_paiement: paymentMethod,
      fournisseur_paiement: '',
      frais_paiement: 0,
      montant_net: financials.montant_net,
      taux_frais: financials.taux_frais,
      date_paiement: new Date(),
      reference_transaction: '',
      statut_paiement: PAYMENT_STATUS.CONFIRME,
      justificatif_notes: amountPaid !== null
        ? 'Forfait et paiement saisis via le portail admin'
        : 'Forfait enregistré via le portail admin — paiement suivi hors système (montant non renseigné ici)',
      mode_saisie: PAYMENT_ENTRY_MODE.MANUEL,
    });

    writeAuditLog_('admin_portal', 'add_package', packageId, '',
      `${totalSessions} séances (dispo ${availableSessions}) — actif`,
      `Cliente ${client.client_id} — créé via portail admin, ` +
      (amountPaid !== null ? `paiement ${montantBrut} GBP (${paymentMethod})` : 'paiement hors système') +
      ` (${paymentId})`);

    return { packageId: packageId };
  } finally {
    lock.releaseLock();
  }
}
