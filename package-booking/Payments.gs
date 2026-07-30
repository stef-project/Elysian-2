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

function adminRecordPayment() {
  const ui = ui_();
  const packageId = ui.prompt('package_id concerné :').getResponseText().trim();
  const pkg = findPackageById_(packageId);
  if (!pkg) { ui.alert('Forfait introuvable.'); return; }

  const montantBrutRaw = ui.prompt('Montant facturé brut (ex. 900) :').getResponseText().trim();
  const montantBrut = parseFloat(montantBrutRaw);
  if (isNaN(montantBrut) || montantBrut < 0) { ui.alert('Montant invalide.'); return; }

  const devise = ui.prompt('Devise (ex. GBP) :').getResponseText().trim().toUpperCase() || 'GBP';

  const moyenPaiementRaw = ui.prompt(
    'Moyen de paiement : revolut_card_payment / revolut_pay / bank_transfer / stripe / ' +
    'classpass / card_in_person / cash / complimentary / other :'
  ).getResponseText().trim().toLowerCase();
  if (Object.values(PAYMENT_METHOD).indexOf(moyenPaiementRaw) === -1) {
    ui.alert('Moyen de paiement invalide.');
    return;
  }

  const fournisseurPaiement = ui.prompt('Fournisseur de paiement (optionnel, ex. "Revolut Business") :').getResponseText().trim();

  const fraisPaiementRaw = ui.prompt('Frais de paiement prélevés (ex. 11), laisser vide ou 0 si aucun/inconnu :').getResponseText().trim();
  const fraisPaiement = fraisPaiementRaw ? parseFloat(fraisPaiementRaw) : 0;
  if (isNaN(fraisPaiement) || fraisPaiement < 0) { ui.alert('Frais invalides.'); return; }

  const { montant_net, taux_frais } = computePaymentFinancials_(montantBrut, fraisPaiement);

  const referenceTransaction = ui.prompt('Référence de transaction (optionnel) :').getResponseText().trim();
  const justificatifNotes = ui.prompt('Justificatif ou note administrative (optionnel) :').getResponseText().trim();

  const confirmNow = ui.alert(
    `Récapitulatif :\nBrut : ${montantBrut} ${devise}\nFrais : ${fraisPaiement} ${devise}\n` +
    `Net : ${montant_net.toFixed(2)} ${devise}\nTaux de frais réel : ${(taux_frais * 100).toFixed(2)}%\n\n` +
    'Confirmer ce paiement maintenant (paiement déjà reçu) ?',
    ui.ButtonSet.YES_NO
  );
  const statutPaiement = confirmNow === ui.Button.YES ? PAYMENT_STATUS.CONFIRME : PAYMENT_STATUS.A_CONFIRMER;

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
  writeAuditLog_('admin', 'record_payment', paymentId, '', statutPaiement, `Forfait ${packageId}`);

  if (statutPaiement === PAYMENT_STATUS.CONFIRME) {
    activatePackageIfPending_(packageId, paymentId);
  }

  ui.alert(
    `Paiement enregistré : ${paymentId} (${statutPaiement}).` +
    (statutPaiement === PAYMENT_STATUS.A_CONFIRMER
      ? '\n\n⚠️ Forfait toujours en attente de paiement — utilise "Confirmer un paiement" une fois reçu pour l\'activer.'
      : '')
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

/** Active un forfait PENDING_PAYMENT après confirmation manuelle d'un paiement — jamais automatique par ouverture de lien. */
function activatePackageIfPending_(packageId, paymentId) {
  const pkg = findPackageById_(packageId);
  if (!pkg) return;
  if (pkg.statut !== PACKAGE_STATUS.PENDING_PAYMENT) return;

  updateRow_(TABS.PACKAGES, pkg.rowNumber, { statut: PACKAGE_STATUS.ACTIVE });
  writeAuditLog_('admin', 'activate_package', packageId, PACKAGE_STATUS.PENDING_PAYMENT, PACKAGE_STATUS.ACTIVE, `Suite paiement ${paymentId}`);
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
