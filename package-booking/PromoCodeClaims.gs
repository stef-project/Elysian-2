/**
 * ============================================================================
 *  PROMOCODECLAIMS.gs — Validation et enregistrement des codes promo
 *  (booking flow client, page /book-chelsea).
 * ============================================================================
 *
 *  Un code promo est valide UNE SEULE FOIS par email client.
 *  Appelé depuis WebApp.gs (action 'validate-promo').
 *
 *  ⚠️ Endpoint public, SANS vérification OTP (contrairement au reste du
 *  parcours cliente) — donc protégé par son propre anti brute-force
 *  (enforceNotLockedOutForPromo_/recordFailedPromoAttempt_, Security.gs,
 *  clés Properties dédiées 'promo_*') pour empêcher de deviner des codes
 *  ou d'épuiser le quota d'un code multi-usages par tentatives automatisées.
 *
 *  La fonction enregistre immédiatement la réclamation dans
 *  Promo_Code_Claims dès la validation — l'email est ainsi "verrouillé"
 *  avant même que le client arrive sur Google Calendar. Si la réservation
 *  n'aboutit pas, l'admin peut modifier booking_status manuellement.
 */

/**
 * Vérifie qu'un code promo est valide pour cet email et ce soin,
 * puis enregistre la réclamation.
 *
 * @param {string} email        - Email du client (insensible à la casse)
 * @param {string} code         - Code promo saisi (insensible à la casse)
 * @param {string} serviceId    - Soin sélectionné (ex. 'lymphatic-1z')
 * @returns {{ discountType, discountValue, message }}
 * @throws BookingBusinessError_ si le code est invalide, expiré ou déjà utilisé
 * @throws RateLimitError_ si trop de tentatives récentes pour cet email
 */
function validateAndClaimPromoCode_(email, code, serviceId) {
  if (!email || !code) {
    throw new BookingBusinessError_('Email et code promo requis.');
  }

  const settings = getSettings();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCode  = String(code).trim().toUpperCase();
  const svcId           = String(serviceId || '').trim();

  // Le verrouillage lui-même (RateLimitError_) n'est jamais "absorbé" par le
  // compteur d'échecs — sinon un email déjà bloqué resterait bloqué à vie.
  enforceNotLockedOutForPromo_(normalizedEmail, settings);

  try {
    const result = claimPromoCode_(normalizedEmail, normalizedCode, svcId);
    clearFailedPromoAttempts_(normalizedEmail);
    return result;
  } catch (err) {
    if (err instanceof BookingBusinessError_) {
      recordFailedPromoAttempt_(normalizedEmail, settings);
    }
    throw err;
  }
}

/** @private Cœur de la validation/réclamation — séparé pour isoler le comptage anti brute-force. */
function claimPromoCode_(normalizedEmail, normalizedCode, svcId) {
  // --- 1. Chercher le code dans Promo_Codes ---
  const promoRow = findRowBy_(TABS.PROMO_CODES, 'code', normalizedCode);
  if (!promoRow) {
    throw new BookingBusinessError_('Code promo invalide.');
  }

  if (promoRow.statut !== PROMO_CODE_STATUS.ACTIVE) {
    throw new BookingBusinessError_('Ce code promo n\'est plus actif.');
  }

  // Défaut 1 (usage unique) si la case est vide — même convention que
  // validatePromoCodeForClient_ (PromoCodes.gs), pour que le même code se
  // comporte identiquement qu'il soit validé côté admin ou côté client.
  const usageMax   = Number(promoRow.usage_max)   || 1;
  const usageCount = Number(promoRow.usage_count) || 0;

  if (usageCount >= usageMax) {
    throw new BookingBusinessError_('Ce code promo a atteint sa limite d\'utilisation globale.');
  }

  // Restriction par client_id : si le code est nominatif, vérifie que l'email
  // correspond bien à la cliente désignée.
  if (promoRow.client_id) {
    const clientRow = findRowBy_(TABS.CLIENTS, 'client_id', promoRow.client_id);
    if (!clientRow || String(clientRow.email).trim().toLowerCase() !== normalizedEmail) {
      throw new BookingBusinessError_('Ce code promo n\'est pas valide pour cet email.');
    }
  }

  // --- 2. Vérifier que cet email n'a pas déjà utilisé ce code ---
  const existingClaim = findExistingClaim_(normalizedEmail, normalizedCode);
  if (existingClaim) {
    throw new BookingBusinessError_('Ce code promo a déjà été utilisé avec cet email.');
  }

  // --- 3. Enregistrer la réclamation (verrouillage avant redirect Calendar) ---
  const claimId = 'CLM-' + Date.now() + '-' + Math.floor(Math.random() * 9999);
  appendRow_(TABS.PROMO_CODE_CLAIMS, {
    claim_id:       claimId,
    code:           normalizedCode,
    client_email:   normalizedEmail,
    service_id:     svcId,
    discount_type:  promoRow.type,
    discount_value: promoRow.value,
    claimed_at:     new Date(),
    booking_status: 'pending',     // l'admin met à jour manuellement après confirmation Calendar
  });

  // --- 4. Incrémenter usage_count dans Promo_Codes ---
  updateRow_(TABS.PROMO_CODES, promoRow.rowNumber, {
    usage_count: usageCount + 1,
  });

  writeAuditLog_(
    'client',
    'promo_claim',
    normalizedCode,
    '',
    claimId,
    'Email: ' + normalizedEmail + ' / soin: ' + svcId
  );

  return {
    claimId:       claimId,
    discountType:  promoRow.type,
    discountValue: Number(promoRow.value),
    message:       'Code promo appliqué.',
  };
}

/**
 * Renvoie la ligne de réclamation existante pour (email, code), ou null.
 * @private
 */
function findExistingClaim_(normalizedEmail, normalizedCode) {
  const rows = readAllRows_(TABS.PROMO_CODE_CLAIMS);
  return rows.find(
    (r) =>
      String(r.client_email).trim().toLowerCase() === normalizedEmail &&
      String(r.code).trim().toUpperCase()         === normalizedCode
  ) || null;
}

/**
 * Libère le quota consommé par une réclamation abandonnée (cliente qui a
 * validé un code mais n'a jamais finalisé sa réservation sur Calendar) —
 * décrémente usage_count sur Promo_Codes et marque la réclamation
 * "released" pour ne jamais la libérer deux fois. Sans cette fonction,
 * un usage_count incrémenté à la validation (avant même la réservation)
 * resterait consommé indéfiniment en cas d'abandon.
 */
function adminReleasePromoClaim() {
  const ui = ui_();
  const claimId = ui.prompt('claim_id de la réclamation à libérer (voir onglet Promo_Code_Claims) :').getResponseText().trim();
  const claim = findRowBy_(TABS.PROMO_CODE_CLAIMS, 'claim_id', claimId);
  if (!claim) { ui.alert('Réclamation introuvable.'); return; }
  if (claim.booking_status === 'released') { ui.alert('Cette réclamation a déjà été libérée.'); return; }

  const promo = findPromoCodeByCode_(claim.code);
  if (!promo) { ui.alert('Code promo introuvable, opération annulée.'); return; }

  const usageCount = Number(promo.usage_count) || 0;
  const newUsageCount = Math.max(0, usageCount - 1);
  updateRow_(TABS.PROMO_CODES, promo.rowNumber, {
    usage_count: newUsageCount,
    // Si le code avait été marqué épuisé par cette réclamation, le rouvrir.
    statut: promo.statut === PROMO_CODE_STATUS.USED ? PROMO_CODE_STATUS.ACTIVE : promo.statut,
  });
  updateRow_(TABS.PROMO_CODE_CLAIMS, claim.rowNumber, { booking_status: 'released' });

  writeAuditLog_(
    'admin', 'release_promo_claim', claim.claim_id,
    `usage_count=${usageCount}`, `usage_count=${newUsageCount}`,
    `Code ${claim.code}, email ${claim.client_email}`
  );
  ui.alert(`Réclamation libérée. Quota du code ${claim.code} restauré (usage_count : ${newUsageCount}).`);
}
