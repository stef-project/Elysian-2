/**
 * ============================================================================
 *  DASHBOARD.gs — Tableau de bord + historique + comparaison période/période
 *  (Phase 2, Étape C, puis extension "Reporting opérationnel").
 * ============================================================================
 *
 *  Comme Fiche_Client (ClientProfile.gs) : `Dashboard` est un onglet de
 *  RAPPORT, régénéré à la demande via le menu admin — pas une source de
 *  données, jamais lu par aucune autre fonction. Chaque indicateur liste les
 *  entités concernées en dessous quand c'est pertinent, pour rester
 *  actionnable et pas seulement décoratif.
 *
 *  `Dashboard_History` est différent : une VRAIE table (une ligne par
 *  génération), pour suivre une tendance dans le temps — tu peux créer un
 *  graphique natif Google Sheets dessus (Insertion → Graphique).
 *
 *  Export : Google Sheets permet déjà nativement de télécharger n'importe
 *  quel onglet en CSV/Excel (Fichier → Télécharger) — aucun code nécessaire
 *  pour ça.
 *
 *  ⚠️ "Clientes provenant de ClassPass" est calculé à partir de
 *  Bookings.source = 'classpass' (saisies manuelles, adminAddManualBooking —
 *  voir AdminMenu.gs), PAS à partir de Clients.origine_premiere_reservation,
 *  qui reste un champ libre jamais rempli automatiquement nulle part dans ce
 *  système. Si ce champ n'est pas renseigné à la main, cet indicateur
 *  refléterait uniquement les réservations ClassPass déjà saisies.
 */

function adminGenerateDashboard() {
  const ui = ui_();
  const { rows, snapshot } = buildDashboardReport_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TABS.DASHBOARD);
  if (!sheet) {
    sheet = ss.insertSheet(TABS.DASHBOARD);
  }
  sheet.clear();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  ss.setActiveSheet(sheet);

  syncSheetHeaderRow_(TABS.DASHBOARD_HISTORY);
  appendRow_(TABS.DASHBOARD_HISTORY, snapshot);

  ui.alert(`Tableau de bord généré dans l'onglet "${TABS.DASHBOARD}" (historique enregistré dans "${TABS.DASHBOARD_HISTORY}").`);
}

function buildDashboardReport_() {
  const rows = [];
  const section = (title) => rows.push([`— ${title} —`, '']);
  const line = (label, value) => rows.push([label, value === undefined || value === null ? '' : String(value)]);

  const offers = readAllRows_(TABS.PACKAGE_OFFERS);
  const packages = readAllRows_(TABS.PACKAGES);
  const payments = readAllRows_(TABS.PAYMENTS);
  const bookings = readAllRows_(TABS.BOOKINGS);
  const clients = readAllRows_(TABS.CLIENTS);
  const promoCodes = readAllRows_(TABS.PROMO_CODES);
  const settings = getSettings();
  const now = new Date();

  rows.push([`Généré le ${Utilities.formatDate(now, settings.timezone, 'yyyy-MM-dd HH:mm')}`, '']);

  // --- Offres ---
  section('Offres de forfait');
  const offersTotal = offers.length;
  const offersPaid = offers.filter((o) => o.statut === OFFER_STATUS.PAID);
  const conversionRate = offersTotal > 0 ? (offersPaid.length / offersTotal) * 100 : 0;
  line('Forfaits proposés (offres créées)', offersTotal);
  line('  → offer_id concernés', offers.map((o) => o.offer_id).join(', ') || '(aucun)');
  line('Forfaits vendus via une offre (statut paid)', offersPaid.length);
  line('  → offer_id concernés', offersPaid.map((o) => o.offer_id).join(', ') || '(aucun)');
  line('Taux de conversion des propositions', `${conversionRate.toFixed(1)}%`);

  // --- Finances ---
  section('Chiffre d\'affaires (paiements confirmés)');
  const confirmedPayments = payments.filter((p) => p.statut_paiement === PAYMENT_STATUS.CONFIRME);
  const grossTotal = confirmedPayments.reduce((sum, p) => sum + (Number(p.montant_brut) || 0), 0);
  const feesTotal = confirmedPayments.reduce((sum, p) => sum + (Number(p.frais_paiement) || 0), 0);
  const netTotal = confirmedPayments.reduce((sum, p) => sum + (Number(p.montant_net) || 0), 0);
  line('Chiffre d\'affaires brut', grossTotal.toFixed(2));
  line('Frais de paiement', feesTotal.toFixed(2));
  line('Chiffre d\'affaires net', netTotal.toFixed(2));
  line('  → payment_id concernés', confirmedPayments.map((p) => p.payment_id).join(', ') || '(aucun)');

  // --- Comparaison période/période (30 derniers jours vs 30 jours précédents) ---
  section('Comparaison période/période (30 jours)');
  const dayMs = 24 * 60 * 60 * 1000;
  const currentStart = new Date(now.getTime() - 30 * dayMs);
  const previousStart = new Date(now.getTime() - 60 * dayMs);
  const inWindow = (dateValue, start, end) => {
    const d = new Date(dateValue);
    return !isNaN(d.getTime()) && d >= start && d < end;
  };
  const currentPayments = confirmedPayments.filter((p) => inWindow(p.date_paiement, currentStart, now));
  const previousPayments = confirmedPayments.filter((p) => inWindow(p.date_paiement, previousStart, currentStart));
  const currentNet = currentPayments.reduce((sum, p) => sum + (Number(p.montant_net) || 0), 0);
  const previousNet = previousPayments.reduce((sum, p) => sum + (Number(p.montant_net) || 0), 0);
  const currentSold = new Set(currentPayments.map((p) => p.package_id)).size;
  const previousSold = new Set(previousPayments.map((p) => p.package_id)).size;
  const pctChange = (curr, prev) => (prev > 0 ? `${(((curr - prev) / prev) * 100).toFixed(1)}%` : 'n/a (aucune donnée période précédente)');
  line('CA net (30 derniers jours)', currentNet.toFixed(2));
  line('CA net (30 jours précédents)', previousNet.toFixed(2));
  line('Variation CA net', pctChange(currentNet, previousNet));
  line('Forfaits vendus (30 derniers jours)', currentSold);
  line('Forfaits vendus (30 jours précédents)', previousSold);
  line('Variation forfaits vendus', pctChange(currentSold, previousSold));

  // --- Forfaits ---
  section('Forfaits');
  const activePackages = packages.filter((p) => p.statut === PACKAGE_STATUS.ACTIVE);
  line('Forfaits actifs', activePackages.length);
  line('  → package_id concernés', activePackages.map((p) => p.package_id).join(', ') || '(aucun)');

  const sessionsStillDue = activePackages.reduce(
    (sum, p) => sum + Number(p.available_sessions || 0) + Number(p.reserved_sessions || 0), 0
  );
  line('Séances encore dues (disponibles + réservées, forfaits actifs)', sessionsStillDue);

  const expirationDaysList = String(settings.reminder_days_before_expiration)
    .split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
  const warningWindow = expirationDaysList.length ? Math.max.apply(null, expirationDaysList) : 30;
  const nearExpiry = activePackages.filter((p) => {
    if (!p.date_expiration) return false;
    const exp = new Date(p.date_expiration);
    if (isNaN(exp.getTime())) return false;
    const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / dayMs);
    return daysUntil >= 0 && daysUntil <= warningWindow;
  });
  line(`Forfaits proches de l'expiration (≤ ${warningWindow}j)`, nearExpiry.length);
  line('  → package_id concernés', nearExpiry.map((p) => p.package_id).join(', ') || '(aucun)');

  // --- ClassPass ---
  section('ClassPass');
  const classpassClientIds = Array.from(new Set(
    bookings.filter((b) => b.source === BOOKING_SOURCE.CLASSPASS).map((b) => b.client_id)
  ));
  line('Clientes provenant de ClassPass (saisies manuelles)', classpassClientIds.length);
  line('  → client_id concernés', classpassClientIds.join(', ') || '(aucun)');

  const classpassToDirect = classpassClientIds.filter((clientId) =>
    payments.some((p) => p.client_id === clientId && p.statut_paiement === PAYMENT_STATUS.CONFIRME && p.moyen_paiement !== PAYMENT_METHOD.CLASSPASS)
  );
  line('Clientes ClassPass ayant ensuite acheté un forfait direct', classpassToDirect.length);
  line('  → client_id concernés', classpassToDirect.join(', ') || '(aucun)');

  const classpassConversionRate = classpassClientIds.length > 0
    ? (classpassToDirect.length / classpassClientIds.length) * 100
    : 0;
  line('Taux de conversion ClassPass → forfait', `${classpassConversionRate.toFixed(1)}%`);

  // --- Parrainage & codes promo ---
  section('Parrainage & codes promo');
  const referredClients = clients.filter((c) =>
    parseTags_(c.tags).some((t) => t.indexOf(REFERRAL_TAG_PREFIX) === 0)
  );
  line('Clientes parrainées (tag referred-by)', referredClients.length);
  line('  → client_id concernés', referredClients.map((c) => c.client_id).join(', ') || '(aucun)');

  // Même définition de "convertie" que checkReferralMilestones_ (CRM.gs) :
  // au moins un paiement RÉEL confirmé — un forfait offert ne compte pas.
  const convertedReferred = referredClients.filter((c) =>
    payments.some((p) =>
      p.client_id === c.client_id &&
      p.statut_paiement === PAYMENT_STATUS.CONFIRME &&
      p.moyen_paiement !== PAYMENT_METHOD.COMPLIMENTARY
    )
  );
  line('Filleules converties (≥ 1 paiement réel confirmé)', convertedReferred.length);
  line('  → client_id concernés', convertedReferred.map((c) => c.client_id).join(', ') || '(aucun)');

  const availablePromoCodes = promoCodes.filter((p) => isPromoCodeCurrentlyAvailable_(p, now));
  line('Codes promo utilisables (actifs, non expirés, quota restant)', availablePromoCodes.length);
  line('  → codes concernés', availablePromoCodes.map((p) => p.code).join(', ') || '(aucun)');

  const promoUsages = promoCodes.reduce((sum, p) => sum + (Number(p.usage_count) || 0), 0);
  line('Utilisations de codes promo (total, tous canaux)', promoUsages);

  const snapshot = {
    generated_at: now,
    offres_proposees: offersTotal,
    offres_payees: offersPaid.length,
    taux_conversion_offres: Number(conversionRate.toFixed(1)),
    ca_brut: Number(grossTotal.toFixed(2)),
    ca_frais: Number(feesTotal.toFixed(2)),
    ca_net: Number(netTotal.toFixed(2)),
    forfaits_actifs: activePackages.length,
    seances_dues: sessionsStillDue,
    forfaits_proches_expiration: nearExpiry.length,
    clientes_classpass: classpassClientIds.length,
    classpass_vers_direct: classpassToDirect.length,
    taux_conversion_classpass: Number(classpassConversionRate.toFixed(1)),
    clientes_parrainees: referredClients.length,
    filleules_converties: convertedReferred.length,
    promo_codes_actifs: availablePromoCodes.length,
    promo_utilisations: promoUsages,
  };

  return { rows, snapshot };
}

/**
 * Réécrit la ligne d'en-têtes d'un onglet si elle ne correspond plus à
 * HEADERS (colonnes ajoutées dans une version ultérieure du code, toujours
 * en fin de liste) — les données existantes ne sont jamais touchées, seule
 * la ligne 1 est réécrite. Sans ça, les nouvelles colonnes d'un classeur
 * déjà initialisé se rempliraient sans titre.
 */
function syncSheetHeaderRow_(tabName) {
  const sh = sheet_(tabName);
  if (!sh) return;
  const headers = HEADERS[tabName];
  const current = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  if (headers.some((h, i) => current[i] !== h)) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}
