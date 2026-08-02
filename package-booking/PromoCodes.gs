/**
 * ============================================================================
 *  PROMOCODES.gs — Codes promo, éventuellement attachés à une cliente précise.
 * ============================================================================
 *
 *  Un code peut être générique (client_id vide, utilisable par n'importe
 *  quelle cliente) ou réservé à une seule cliente (client_id renseigné).
 *  Chaque code n'est utilisable qu'UNE SEULE FOIS — marqué "used" dès son
 *  application, jamais réutilisable ensuite.
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

/** Marque un code promo comme utilisé — jamais réutilisable ensuite. */
function markPromoCodeUsed_(promo, clientId, packageId) {
  updateRow_(TABS.PROMO_CODES, promo.rowNumber, {
    statut: PROMO_CODE_STATUS.USED,
    used_at: new Date(),
    used_by_client_id: clientId,
    used_for_package_id: packageId,
  });
  writeAuditLog_('admin', 'use_promo_code', promo.promo_code_id, PROMO_CODE_STATUS.ACTIVE, PROMO_CODE_STATUS.USED, `Forfait ${packageId}`);
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

  const expirationDaysRaw = ui.prompt('Validité en jours (laisser vide si aucune) :').getResponseText().trim();
  const dateExpiration = expirationDaysRaw
    ? new Date(Date.now() + parseInt(expirationDaysRaw, 10) * 24 * 60 * 60 * 1000)
    : '';

  const notesAdmin = ui.prompt('Note interne (optionnel) :').getResponseText().trim();

  const promoCodeId = genId_('PROMO');
  appendRow_(TABS.PROMO_CODES, {
    promo_code_id: promoCodeId,
    code: codeRaw,
    client_id: clientId,
    type: typeRaw,
    value: value,
    statut: PROMO_CODE_STATUS.ACTIVE,
    date_creation: new Date(),
    date_expiration: dateExpiration,
    used_at: '',
    used_by_client_id: '',
    used_for_package_id: '',
    notes_admin: notesAdmin,
  });
  writeAuditLog_('admin', 'create_promo_code', promoCodeId, '', codeRaw, clientId ? `Réservé à ${clientId}` : 'Générique');
  ui.alert(`Code promo créé : ${codeRaw}` + (clientId ? ` (réservé à ${clientId})` : ' (générique)'));
}

function adminCancelPromoCode() {
  const ui = ui_();
  const codeRaw = ui.prompt('Code promo à annuler :').getResponseText().trim();
  const promo = findPromoCodeByCode_(codeRaw);
  if (!promo) { ui.alert('Code introuvable.'); return; }
  if (promo.statut !== PROMO_CODE_STATUS.ACTIVE) { ui.alert(`Ce code est déjà "${promo.statut}", rien à annuler.`); return; }

  updateRow_(TABS.PROMO_CODES, promo.rowNumber, { statut: PROMO_CODE_STATUS.CANCELLED });
  writeAuditLog_('admin', 'cancel_promo_code', promo.promo_code_id, PROMO_CODE_STATUS.ACTIVE, PROMO_CODE_STATUS.CANCELLED, '');
  ui.alert('Code promo annulé.');
}
