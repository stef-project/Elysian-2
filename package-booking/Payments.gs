/**
 * ============================================================================
 *  PAYMENTS.gs — Saisie des paiements, calcul brut/frais/net (Phase 2, Étape A).
 * ============================================================================
 *
 *  Aucune intégration API de paiement n'existe dans ce dépôt (Stripe reste
 *  configuré dans Google Workspace, en dehors de ce projet — voir README
 *  principal). La "confirmation automatique du paiement" mentionnée dans le
 *  cadrage n'est donc PAS implémentée ici : il n'existe aucune passerelle
 *  réelle à interroger depuis Apps Script pour Revolut/virement/ClassPass.
 *  Toute confirmation est donc manuelle, faite par l'administratrice — ce
 *  fichier ne prétend jamais le contraire.
 *
 *  Un forfait créé via adminAddPackage (AdminMenu.gs) démarre au statut
 *  PENDING_PAYMENT et n'est PAS réservable (findEligiblePackages_ et
 *  confirmPackageBooking exigent statut === ACTIVE). Il ne devient ACTIVE
 *  que lorsqu'un paiement lié est enregistré/confirmé ici.
 *
 *  Formule : taux_frais = frais_paiement / montant_brut ; montant_net =
 *  montant_brut - frais_paiement. Les frais ne sont jamais présentés comme
 *  un supplément facturé à la cliente — uniquement un chiffre de marge
 *  interne (colonnes non exposées côté site).
 */

/** Calcule net et taux à partir du brut et des frais. Ne modifie rien, pur calcul. */
function computePaymentFinancials_(montantBrut, fraisPaiement) {
  const brut = Number(montantBrut) || 0;
  const frais = Number(fraisPaiement) || 0;
  const net = brut - frais;
  const taux = brut > 0 ? frais / brut : 0;
  return { montant_net: net, taux_frais: taux };
}

function findPaymentById_(paymentId) {
  return findRowBy_(TABS.PAYMENTS, 'payment_id', paymentId);
}

/** Tous les paiements liés à un forfait (utilisé par ClientProfile.gs). */
function findPaymentsByPackageId_(packageId) {
  return readAllRows_(TABS.PAYMENTS).filter((p) => p.package_id === packageId);
}

/** Tous les paiements liés à une cliente (utilisé par ClientProfile.gs). */
function findPaymentsByClientId_(clientId) {
  return readAllRows_(TABS.PAYMENTS).filter((p) => p.client_id === clientId);
}

/**
 * Cœur interactif de la saisie d'un paiement — seule fonction qui écrit dans
 * Payments. Utilisée à la fois par adminRecordPayment() (paiement enregistré
 * a posteriori sur un forfait déjà existant) et par le parcours "paiement
 * déjà reçu / forfait historique" dans adminAddPackage() (AdminMenu.gs), pour
 * ne jamais dupliquer la logique de calcul ni de validation.
 *
 * "Aucun forfait ne doit être activé sans une trace de paiement ou un motif
 * administratif explicite" : pour les moyens peu traçables (cash,
 * complimentary, other), justificatif_notes devient obligatoire ici.
 *
 * Propose aussi un code promo optionnel (PromoCodes.gs) avant le calcul des
 * frais — un seul point d'entrée de saisie de paiement, donc un seul endroit
 * où appliquer/marquer un code utilisé, sans dupliquer cette logique.
 *
 * @param {string} packageId
 * @param {{forceConfirmed: boolean}} options - forceConfirmed=true saute la
 *   question "confirmer maintenant ?" (utilisé quand l'admin affirme déjà que
 *   le paiement est reçu, ex. parcours "forfait historique").
 * @returns {string|null} payment_id créé, ou null si l'admin a annulé.
 */
function promptAndRecordPayment_(packageId, options) {
  const ui = ui_();
  const pkg = findPackageById_(packageId);
  if (!pkg) { ui.alert('Forfait introuvable.'); return null; }

  const moyenPaiementRaw = ui.prompt(
    'Moyen de paiement : revolut_card_payment / revolut_pay / bank_transfer / stripe / ' +
    'classpass / card_in_person / cash / complimentary / other :'
  ).getResponseText().trim().toLowerCase();
  if (Object.values(PAYMENT_METHOD).indexOf(moyenPaiementRaw) === -1) {
    ui.alert('Moyen de paiement invalide.');
    return null;
  }
  const isComplimentary = moyenPaiementRaw === PAYMENT_METHOD.COMPLIMENTARY;

  let montantBrut = 0;
  let fraisPaiement = 0;
  let devise = 'GBP';
  let appliedPromo = null;

  if (isComplimentary) {
    ui.alert('Forfait offert (complimentary) : montant brut et frais fixés à 0 automatiquement.');
  } else {
    devise = ui.prompt('Devise (ex. GBP) :').getResponseText().trim().toUpperCase() || 'GBP';

    const montantBrutRaw = ui.prompt('Montant facturé brut (ex. 900) :').getResponseText().trim();
    montantBrut = parseFloat(montantBrutRaw);
    if (isNaN(montantBrut) || montantBrut < 0) { ui.alert('Montant invalide.'); return null; }

    const promoCodeRaw = ui.prompt('Code promo à appliquer (optionnel, laisser vide si aucun) :').getResponseText().trim();
    if (promoCodeRaw) {
      const promo = validatePromoCodeForClient_(promoCodeRaw, pkg.client_id);
      if (promo) {
        const montantApresRemise = applyPromoDiscount_(montantBrut, promo);
        ui.alert(`Code promo appliqué : ${montantBrut.toFixed(2)} ${devise} → ${montantApresRemise.toFixed(2)} ${devise}.`);
        montantBrut = montantApresRemise;
        appliedPromo = promo;
      }
    }

    const fraisPaiementRaw = ui.prompt('Frais de paiement prélevés (ex. 11), laisser vide ou 0 si aucun/inconnu :').getResponseText().trim();
    fraisPaiement = fraisPaiementRaw ? parseFloat(fraisPaiementRaw) : 0;
    if (isNaN(fraisPaiement) || fraisPaiement < 0) { ui.alert('Frais invalides.'); return null; }
  }

  const fournisseurPaiement = isComplimentary ? '' : ui.prompt('Fournisseur de paiement (optionnel, ex. "Revolut Business") :').getResponseText().trim();
  const { montant_net, taux_frais } = computePaymentFinancials_(montantBrut, fraisPaiement);

  const referenceTransaction = isComplimentary ? '' : ui.prompt('Référence de transaction (optionnel) :').getResponseText().trim();

  // Moyens peu traçables : trace de paiement quasi inexistante -> motif obligatoire.
  const motifRequired = [PAYMENT_METHOD.CASH, PAYMENT_METHOD.COMPLIMENTARY, PAYMENT_METHOD.OTHER].indexOf(moyenPaiementRaw) !== -1;
  const justificatifPrompt = motifRequired
    ? 'Motif / justificatif (OBLIGATOIRE pour ce moyen de paiement) :'
    : 'Justificatif ou note administrative (optionnel) :';
  const justificatifNotes = ui.prompt(justificatifPrompt).getResponseText().trim();
  if (motifRequired && !justificatifNotes) {
    ui.alert('Motif obligatoire pour ce moyen de paiement (cash / complimentary / other), opération annulée.');
    return null;
  }

  let statutPaiement;
  if (options && options.forceConfirmed) {
    statutPaiement = PAYMENT_STATUS.CONFIRME;
  } else {
    const confirmNow = ui.alert(
      `Récapitulatif :\nBrut : ${montantBrut} ${devise}\nFrais : ${fraisPaiement} ${devise}\n` +
      `Net : ${montant_net.toFixed(2)} ${devise}\nTaux de frais réel : ${(taux_frais * 100).toFixed(2)}%\n\n` +
      'Confirmer ce paiement maintenant (paiement déjà reçu) ?',
      ui.ButtonSet.YES_NO
    );
    statutPaiement = confirmNow === ui.Button.YES ? PAYMENT_STATUS.CONFIRME : PAYMENT_STATUS.A_CONFIRMER;
  }

  const paymentId = genId_('PAY');
  appendRow_(TABS.PAYMENTS, {
    payment_id: paymentId,
    client_id: pkg.client_id,
    package_id: packageId,
    montant_brut: montantBrut,
    devise,
    moyen_paiement: moyenPaiementRaw,
    fournisseur_paiement: fournisseurPaiement,
    frais_paiement: fraisPaiement,
    montant_net,
    taux_frais,
    date_paiement: new Date(),
    reference_transaction: referenceTransaction,
    statut_paiement: statutPaiement,
    justificatif_notes: justificatifNotes,
    mode_saisie: PAYMENT_ENTRY_MODE.MANUEL,
  });
  writeAuditLog_('admin', 'record_payment', paymentId, '', statutPaiement, `Forfait ${packageId} (${moyenPaiementRaw})${justificatifNotes ? ' — ' + justificatifNotes : ''}`);

  if (appliedPromo) {
    markPromoCodeUsed_(appliedPromo, pkg.client_id, packageId);
  }

  if (statutPaiement === PAYMENT_STATUS.CONFIRME) {
    activatePackageIfPending_(packageId, paymentId);
  }

  return paymentId;
}

function adminRecordPayment() {
  const ui = ui_();
  const packageId = ui.prompt('package_id concerné :').getResponseText().trim();
  const paymentId = promptAndRecordPayment_(packageId, { forceConfirmed: false });
  if (!paymentId) return;

  const payment = findPaymentById_(paymentId);
  ui.alert(
    `Paiement enregistré : ${paymentId} (${payment.statut_paiement}).` +
    (payment.statut_paiement === PAYMENT_STATUS.A_CONFIRMER
      ? '\n\n⚠️ Forfait toujours en attente de paiement — utilise "Confirmer un paiement" une fois reçu pour l\'activer.'
      : '\n\nForfait activé (ou déjà actif).')
  );
}

/** Confirme un paiement resté "à_confirmer" (ex. virement arrivé plus tard) et active le forfait lié si besoin. */
function adminConfirmPayment() {
  const ui = ui_();
  const paymentId = ui.prompt('payment_id à confirmer :').getResponseText().trim();
  const payment = findPaymentById_(paymentId);
  if (!payment) { ui.alert('Paiement introuvable.'); return; }
  if (payment.statut_paiement === PAYMENT_STATUS.CONFIRME) { ui.alert('Ce paiement est déjà confirmé.'); return; }

  updateRow_(TABS.PAYMENTS, payment.rowNumber, { statut_paiement: PAYMENT_STATUS.CONFIRME });
  writeAuditLog_('admin', 'confirm_payment', paymentId, payment.statut_paiement, PAYMENT_STATUS.CONFIRME, 'Confirmation manuelle');

  activatePackageIfPending_(payment.package_id, paymentId);
  ui.alert('Paiement confirmé.');
}

/**
 * Active un forfait PENDING_PAYMENT après confirmation manuelle d'un paiement
 * — jamais automatique par ouverture ou acceptation d'un lien d'offre. Si ce
 * forfait provient d'une offre convertie (adminConvertOfferToPackage,
 * PackageOffers.gs), fait aussi passer l'offre à "paid". Envoie aussi la
 * confirmation post-achat (Notifications.gs, Phase 2 Étape C) — un seul
 * endroit qui décide de l'activation, réutilisé par tous les parcours de
 * paiement, donc la confirmation part toujours au bon moment, sans doublon
 * de logique d'activation.
 */
function activatePackageIfPending_(packageId, paymentId) {
  const pkg = findPackageById_(packageId);
  if (!pkg) return;
  if (pkg.statut !== PACKAGE_STATUS.PENDING_PAYMENT) return;

  updateRow_(TABS.PACKAGES, pkg.rowNumber, { statut: PACKAGE_STATUS.ACTIVE });
  writeAuditLog_('admin', 'activate_package', packageId, PACKAGE_STATUS.PENDING_PAYMENT, PACKAGE_STATUS.ACTIVE, `Suite paiement ${paymentId}`);
  sendPostPurchaseConfirmation_(packageId);

  const linkedOffer = readAllRows_(TABS.PACKAGE_OFFERS).find((o) => o.package_id_resultant === packageId);
  if (linkedOffer && linkedOffer.statut !== OFFER_STATUS.PAID) {
    updateRow_(TABS.PACKAGE_OFFERS, linkedOffer.rowNumber, { statut: OFFER_STATUS.PAID });
    writeAuditLog_('system', 'offer_marked_paid', linkedOffer.offer_id, linkedOffer.statut, OFFER_STATUS.PAID, `Suite activation forfait ${packageId}`);
  }

  // Chaque activation peut faire franchir un palier de parrainage à une
  // marraine (CRM.gs) — revérifié à chaque fois, dédoublonné par palier.
  checkReferralMilestones_();
}

/**
 * Crée un forfait actif + une ligne Payments confirmée à 0, sans passer par
 * le flux interactif (promptAndRecordPayment_) — utilisé pour les
 * récompenses accordées automatiquement par le système (parrainage,
 * CRM.gs), jamais pour un paiement réel. Trace complète dans Payments et
 * Audit_Log, comme n'importe quel autre forfait offert.
 */
function grantComplimentaryPackage_(clientId, nomForfait, totalSessions, motif) {
  const packageId = genId_('PKG');
  appendRow_(TABS.PACKAGES, {
    package_id: packageId,
    client_id: clientId,
    nom_forfait: nomForfait,
    soins_inclus: '',
    total_sessions: totalSessions,
    available_sessions: totalSessions,
    reserved_sessions: 0,
    used_sessions: 0,
    date_achat: new Date(),
    date_expiration: '',
    moyen_paiement: '',
    statut: PACKAGE_STATUS.ACTIVE,
    notes_admin: motif,
    package_template_id: '',
  });

  const paymentId = genId_('PAY');
  const { montant_net, taux_frais } = computePaymentFinancials_(0, 0);
  appendRow_(TABS.PAYMENTS, {
    payment_id: paymentId,
    client_id: clientId,
    package_id: packageId,
    montant_brut: 0,
    devise: 'GBP',
    moyen_paiement: PAYMENT_METHOD.COMPLIMENTARY,
    fournisseur_paiement: '',
    frais_paiement: 0,
    montant_net: montant_net,
    taux_frais: taux_frais,
    date_paiement: new Date(),
    reference_transaction: '',
    statut_paiement: PAYMENT_STATUS.CONFIRME,
    justificatif_notes: motif,
    mode_saisie: PAYMENT_ENTRY_MODE.MANUEL,
  });

  writeAuditLog_('system', 'grant_complimentary_package', packageId, '', clientId, motif);
  return packageId;
}

function adminMarkPaymentRefused() {
  const ui = ui_();
  const paymentId = ui.prompt('payment_id concerné :').getResponseText().trim();
  const payment = findPaymentById_(paymentId);
  if (!payment) { ui.alert('Paiement introuvable.'); return; }

  const motif = ui.prompt('Motif (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire.'); return; }

  updateRow_(TABS.PAYMENTS, payment.rowNumber, { statut_paiement: PAYMENT_STATUS.REFUSE });
  writeAuditLog_('admin', 'refuse_payment', paymentId, payment.statut_paiement, PAYMENT_STATUS.REFUSE, motif);
  ui.alert('Paiement marqué refusé. Le forfait lié reste en attente de paiement (non activé).');
}
