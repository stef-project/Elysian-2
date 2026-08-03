/**
 * ============================================================================
 *  PROMOCODECLAIMS.gs — Validation et enregistrement des codes promo
 *  (booking flow client, page /book-chelsea).
 * ============================================================================
 *
 *  Un code promo est valide UNE SEULE FOIS par email client.
 *  Appelé depuis WebApp.gs (action 'validate-promo').
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
 */
function validateAndClaimPromoCode_(email, code, serviceId) {
  if (!email || !code) {
    throw new BookingBusinessError_('Email et code promo requis.');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCode  = String(code).trim().toUpperCase();
  const svcId           = String(serviceId || '').trim();

  // --- 1. Chercher le code dans Promo_Codes ---
  const promoRow = findRowBy_(TABS.PROMO_CODES, 'code', normalizedCode);
  if (!promoRow) {
    throw new BookingBusinessError_('Code promo invalide.');
  }

  if (promoRow.statut !== 'active') {
    throw new BookingBusinessError_('Ce code promo n\'est plus actif.');
  }

  const usageMax   = Number(promoRow.usage_max)   || 0;
  const usageCount = Number(promoRow.usage_count) || 0;

  if (usageMax > 0 && usageCount >= usageMax) {
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
