/**
 * ============================================================================
 *  PROMOCODES.gs — Codes promo, éventuellement attachés à une cliente précise.
 * ============================================================================
 *
 *  Un code peut être générique (client_id vide, utilisable par n'importe
 *  quelle cliente — ex. un code partagé par une cliente à ses contacts) ou
 *  réservé à une seule cliente (client_id renseigné).
 *
 *  Usage limité par `usage_max` (défaut 1 = usage unique, comportement
 *  d'origine). Chaque utilisation incrémente `usage_count` ; le code ne
 *  passe au statut "used" (définitivement épuisé) qu'une fois
 *  usage_count >= usage_max — jusque-là il reste "active" et réutilisable
 *  par d'autres clientes. `used_at`/`used_by_client_id`/`used_for_package_id`
 *  ne reflètent que la DERNIÈRE utilisation (aperçu rapide) ; l'historique
 *  complet de chaque utilisation reste dans Audit_Log (action
 *  "use_promo_code"), jamais perdu même en cas d'usages multiples.
 *
 *  Volontairement limité à deux types de remise simples sur le montant
 *  facturé (percentage / fixed_amount) — pas de type "séances offertes" ici,
 *  pour ne jamais mélanger remise de paiement et ajustement de forfait dans
 *  la même fonction (ce cas existe déjà séparément : forfait "complimentary").
 *
 *  Intégré au SEUL point d'entrée de saisie de paiement (promptAndRecordPayment_,
 *  Payments.gs) — donc disponible partout où un paiement se saisit
 *  (adminRecordPayment, adminAddPackage "déjà reçu", adminConvertOfferToPackage),
 *  sans dupliquer la logique de validation/application à chaque endroit.
 */

function findPromoCodeByCode_(codeRaw) {
  return findRowBy_(TABS.PROMO_CODES, 'code', String(codeRaw || '').trim().toUpperCase());
}

/**
 * Génère un code promo lisible et unique (ex. "WELCOME-4FQ7"), en excluant
 * les caractères ambigus (0/O, 1/I/L). Vérifie l'unicité contre l'onglet
 * Promo_Codes — jamais deux codes identiques, même générés le même jour.
 */
function generateUniquePromoCode_(prefix) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    const code = `${String(prefix || 'PROMO').toUpperCase()}-${suffix}`;
    if (!findPromoCodeByCode_(code)) return code;
  }
  throw new Error('Impossible de générer un code promo unique après 20 tentatives.');
}

/**
 * Cœur (non interactif) de la création d'un code promo — seule fonction qui
 * écrit dans Promo_Codes. Réutilisée par le menu Sheet (adminCreatePromoCode),
 * le portail admin web (adminPortalCreatePromoCode_, Portal.gs) et la remise
 * de bienvenue automatique des clientes parrainées (grantReferralWelcomePromo_,
 * CRM.gs) — la validation et l'écriture ne sont jamais dupliquées.
 *
 * Lève BookingBusinessError_ (message montrable) en cas de paramètre invalide.
 *
 * @param {{code: string, clientId: string, type: string, value: number,
 *          usageMax: number, dateExpiration: (Date|string), notesAdmin: string,
 *          actor: string}} params
 * @returns {string} promo_code_id créé
 */
function createPromoCode_(params) {
  const code = String(params.code || '').trim().toUpperCase();
  if (!code) throw new BookingBusinessError_('Code promo vide.');

  if (Object.values(PROMO_CODE_TYPE).indexOf(params.type) === -1) {
    throw new BookingBusinessError_('Type de remise invalide.');
  }
  const value = Number(params.value);
  if (isNaN(value) || value <= 0) throw new BookingBusinessError_('Valeur de remise invalide.');
  if (params.type === PROMO_CODE_TYPE.PERCENTAGE && value > 100) {
    throw new BookingBusinessError_('Un pourcentage de remise ne peut pas dépasser 100.');
  }
  const usageMax = Number(params.usageMax) || 1;
  if (usageMax < 1) throw new BookingBusinessError_('Nombre d\'utilisations invalide.');

  // Vérification d'unicité et écriture sous verrou — sans lui, deux appels
  // simultanés (double-clic sur le portail) passeraient tous les deux le
  // check d'unicité avant que l'un des deux n'écrive, créant un doublon.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');
  }
  try {
    if (findPromoCodeByCode_(code)) throw new BookingBusinessError_('Ce code existe déjà.');

    const promoCodeId = genId_('PROMO');
    appendRow_(TABS.PROMO_CODES, {
      promo_code_id: promoCodeId,
      code: code,
      client_id: params.clientId || '',
      type: params.type,
      value: value,
      statut: PROMO_CODE_STATUS.ACTIVE,
      date_creation: new Date(),
      date_expiration: params.dateExpiration || '',
      used_at: '',
      used_by_client_id: '',
      used_for_package_id: '',
      notes_admin: params.notesAdmin || '',
      usage_max: usageMax,
      usage_count: 0,
    });
    writeAuditLog_(
      params.actor || 'admin', 'create_promo_code', promoCodeId, '', code,
      `${params.clientId ? `Réservé à ${params.clientId}` : 'Générique'}, usage_max=${usageMax}`
    );
    return promoCodeId;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Valide un code promo pour une cliente donnée. Renvoie la ligne du code si
 * valide, ou null avec un message d'alerte si invalide — ne bloque jamais
 * la saisie du paiement en cours, un code invalide est simplement ignoré.
 */
function validatePromoCodeForClient_(codeRaw, clientId) {
  const ui = ui_();
  const promo = findPromoCodeByCode_(codeRaw);
  if (!promo) {
    ui.alert('Code promo introuvable — ignoré.');
    return null;
  }
  if (promo.statut !== PROMO_CODE_STATUS.ACTIVE) {
    ui.alert(`Ce code promo n'est plus actif (statut : ${promo.statut}) — ignoré.`);
    return null;
  }
  if (promo.date_expiration) {
    const exp = new Date(promo.date_expiration);
    if (!isNaN(exp.getTime()) && exp < new Date()) {
      updateRow_(TABS.PROMO_CODES, promo.rowNumber, { statut: PROMO_CODE_STATUS.EXPIRED });
      ui.alert('Ce code promo a expiré — ignoré.');
      return null;
    }
  }
  if (promo.client_id && promo.client_id !== clientId) {
    ui.alert('Ce code promo est réservé à une autre cliente — ignoré.');
    return null;
  }
  const usageMax = Number(promo.usage_max) || 1;
  const usageCount = Number(promo.usage_count) || 0;
  if (usageCount >= usageMax) {
    ui.alert(`Ce code promo a atteint son nombre maximum d'utilisations (${usageMax}) — ignoré.`);
    return null;
  }
  return promo;
}

/** Applique la remise d'un code promo à un montant brut. Ne modifie jamais le Sheet — pur calcul. */
function applyPromoDiscount_(montantBrut, promo) {
  const value = Number(promo.value) || 0;
  if (promo.type === PROMO_CODE_TYPE.PERCENTAGE) {
    return Math.max(0, montantBrut * (1 - value / 100));
  }
  if (promo.type === PROMO_CODE_TYPE.FIXED_AMOUNT) {
    return Math.max(0, montantBrut - value);
  }
  return montantBrut;
}

/**
 * Enregistre une utilisation d'un code promo. Incrémente usage_count ; le
 * code ne passe à "used" (épuisé, jamais réutilisable) que lorsque
 * usage_count atteint usage_max — sinon il reste "active" pour la
 * utilisation suivante (ex. un code partagé à plusieurs contacts).
 */
function markPromoCodeUsed_(promo, clientId, packageId) {
  const usageMax = Number(promo.usage_max) || 1;
  const usageCountBefore = Number(promo.usage_count) || 0;
  const usageCountAfter = usageCountBefore + 1;
  const exhausted = usageCountAfter >= usageMax;

  updateRow_(TABS.PROMO_CODES, promo.rowNumber, {
    statut: exhausted ? PROMO_CODE_STATUS.USED : PROMO_CODE_STATUS.ACTIVE,
    used_at: new Date(),
    used_by_client_id: clientId,
    used_for_package_id: packageId,
    usage_count: usageCountAfter,
  });
  writeAuditLog_(
    'admin', 'use_promo_code', promo.promo_code_id,
    `usage_count=${usageCountBefore}`, `usage_count=${usageCountAfter}`,
    `Forfait ${packageId} (cliente ${clientId})${exhausted ? ' — code désormais épuisé' : ''}`
  );
}

function adminCreatePromoCode() {
  const ui = ui_();
  const codeRaw = ui.prompt('Code promo (ex. WELCOME10) :').getResponseText().trim().toUpperCase();
  if (!codeRaw) { ui.alert('Code vide, opération annulée.'); return; }
  if (findPromoCodeByCode_(codeRaw)) { ui.alert('Ce code existe déjà.'); return; }

  const restrictEmail = ui.prompt('Réserver à une cliente précise ? Email (laisser vide pour un code générique) :').getResponseText().trim().toLowerCase();
  let clientId = '';
  if (restrictEmail) {
    const client = findClientByEmail_(restrictEmail);
    if (!client) { ui.alert('Cliente introuvable, opération annulée.'); return; }
    clientId = client.client_id;
  }

  const typeRaw = ui.prompt('Type de remise : "percentage" ou "fixed_amount" :').getResponseText().trim().toLowerCase();
  if (Object.values(PROMO_CODE_TYPE).indexOf(typeRaw) === -1) { ui.alert('Type invalide.'); return; }

  const valueRaw = ui.prompt(typeRaw === PROMO_CODE_TYPE.PERCENTAGE ? 'Pourcentage de remise (ex. 10) :' : 'Montant de remise (ex. 20) :').getResponseText().trim();
  const value = parseFloat(valueRaw);
  if (isNaN(value) || value <= 0) { ui.alert('Valeur invalide.'); return; }

  const usageMaxRaw = ui.prompt('Nombre d\'utilisations autorisées (laisser vide pour 1 = usage unique) :').getResponseText().trim();
  const usageMax = usageMaxRaw ? parseInt(usageMaxRaw, 10) : 1;
  if (isNaN(usageMax) || usageMax < 1) { ui.alert('Nombre d\'utilisations invalide.'); return; }

  const expirationDaysRaw = ui.prompt('Validité en jours (laisser vide si aucune) :').getResponseText().trim();
  const dateExpiration = expirationDaysRaw
    ? new Date(Date.now() + parseInt(expirationDaysRaw, 10) * 24 * 60 * 60 * 1000)
    : '';

  const notesAdmin = ui.prompt('Note interne (optionnel) :').getResponseText().trim();

  try {
    createPromoCode_({
      code: codeRaw,
      clientId: clientId,
      type: typeRaw,
      value: value,
      usageMax: usageMax,
      dateExpiration: dateExpiration,
      notesAdmin: notesAdmin,
      actor: 'admin',
    });
  } catch (err) {
    ui.alert(err && err.message ? err.message : 'Création du code impossible.');
    return;
  }
  ui.alert(`Code promo créé : ${codeRaw}` + (clientId ? ` (réservé à ${clientId})` : ' (générique)') + ` — ${usageMax} utilisation(s) autorisée(s).`);
}

/**
 * Cœur (non interactif) de l'annulation d'un code promo — réutilisé par le
 * menu Sheet (adminCancelPromoCode) et le portail admin web
 * (adminPortalCancelPromoCode_, Portal.gs), comme createPromoCode_ pour la
 * création. Lève BookingBusinessError_ (message montrable) si le code est
 * introuvable ou n'est plus actif.
 */
function cancelPromoCodeByCode_(codeRaw, actor) {
  const promo = findPromoCodeByCode_(codeRaw);
  if (!promo) throw new BookingBusinessError_('Code introuvable.');
  if (promo.statut !== PROMO_CODE_STATUS.ACTIVE) {
    throw new BookingBusinessError_(`Ce code est déjà "${promo.statut}", rien à annuler.`);
  }
  updateRow_(TABS.PROMO_CODES, promo.rowNumber, { statut: PROMO_CODE_STATUS.CANCELLED });
  writeAuditLog_(actor || 'admin', 'cancel_promo_code', promo.promo_code_id, PROMO_CODE_STATUS.ACTIVE, PROMO_CODE_STATUS.CANCELLED, '');
}

function adminCancelPromoCode() {
  const ui = ui_();
  const codeRaw = ui.prompt('Code promo à annuler :').getResponseText().trim();
  try {
    cancelPromoCodeByCode_(codeRaw, 'admin');
  } catch (err) {
    ui.alert(err && err.message ? err.message : 'Annulation impossible.');
    return;
  }
  ui.alert('Code promo annulé.');
}
