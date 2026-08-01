/**
 * ============================================================================
 *  DASHBOARD.gs — Tableau de bord (Phase 2, Étape C).
 * ============================================================================
 *
 *  Comme Fiche_Client (ClientProfile.gs) : un onglet de RAPPORT, régénéré à
 *  la demande via le menu admin — pas une source de données, jamais lu par
 *  aucune autre fonction. Chaque indicateur liste les entités concernées en
 *  dessous quand c'est pertinent, pour rester actionnable et pas seulement
 *  décoratif (ex. les forfaits proches de l'expiration sont listés par
 *  package_id, pas juste comptés).
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
  const rows = buildDashboardReport_();

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

  ui.alert(`Tableau de bord généré dans l'onglet "${TABS.DASHBOARD}".`);
}

function buildDashboardReport_() {
  const rows = [];
  const section = (title) => rows.push([`— ${title} —`, '']);
  const line = (label, value) => rows.push([label, value === undefined || value === null ? '' : String(value)]);

  const offers = readAllRows_(TABS.PACKAGE_OFFERS);
  const packages = readAllRows_(TABS.PACKAGES);
  const payments = readAllRows_(TABS.PAYMENTS);
  const bookings = readAllRows_(TABS.BOOKINGS);
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
    const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
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

  return rows;
}
