/**
 * ============================================================================
 *  CLIENTPROFILE.gs — Fiche cliente consolidée (Phase 2, Étape A).
 * ============================================================================
 *
 *  Vue en lecture seule qui agrège Clients / Packages / Bookings / Payments
 *  pour une cliente donnée. Régénérée à chaque consultation dans l'onglet
 *  "Fiche_Client" (pas une table de données — un rapport, écrasé et
 *  réécrit à chaque appel, jamais lu par aucune autre fonction).
 *
 *  ⚠️ Aucune donnée médicale ou de santé n'est stockée nulle part dans ce
 *  système ; cette fiche reste strictement commerciale/opérationnelle
 *  (identité, historique de rendez-vous, forfaits, paiements, consentement).
 *
 *  Sources déjà couvertes en V1/Étape A : package_booking (Bookings créés
 *  par la saga), admin_manual. classpass et whatsapp sont couverts via
 *  adminAddManualBooking_ (AdminMenu.gs) — saisie manuelle uniquement, comme
 *  demandé ; aucune synchronisation ClassPass automatique n'est prétendue.
 */

function adminViewClientProfile() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Aucune cliente avec cet email.'); return; }

  const rows = buildClientProfileReport_(client);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TABS.CLIENT_PROFILE_VIEW);
  if (!sheet) {
    sheet = ss.insertSheet(TABS.CLIENT_PROFILE_VIEW);
  }
  sheet.clear();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  ss.setActiveSheet(sheet);

  ui.alert(`Fiche de ${client.prenom} ${client.nom} générée dans l'onglet "${TABS.CLIENT_PROFILE_VIEW}".`);
}

/** Construit le rapport sous forme de lignes [label, valeur], prêtes à écrire dans le Sheet. */
function buildClientProfileReport_(client) {
  const rows = [];
  const section = (title) => rows.push([`— ${title} —`, '']);
  const line = (label, value) => rows.push([label, value === undefined || value === null || value === '' ? '' : String(value)]);

  section('Identité et coordonnées');
  line('client_id', client.client_id);
  line('Nom', `${client.prenom} ${client.nom}`);
  line('Email', client.email);
  line('Téléphone', client.telephone);
  line('Cliente depuis', formatDateForReport_(client.date_creation));
  line('Origine première réservation', client.origine_premiere_reservation || '(non renseignée)');
  line('Consentement communications commerciales', client.consentement_marketing || '(non renseigné)');
  line('Notes admin', client.notes_admin);

  const packages = readAllRows_(TABS.PACKAGES).filter((p) => p.client_id === client.client_id);
  const bookings = readAllRows_(TABS.BOOKINGS).filter((b) => b.client_id === client.client_id);
  const payments = findPaymentsByClientId_(client.client_id);
  const now = new Date();

  section('Forfaits actifs');
  packages.filter((p) => p.statut === PACKAGE_STATUS.ACTIVE).forEach((p) => {
    line(p.package_id, `${p.nom_forfait} — dispo ${p.available_sessions} / réservées ${p.reserved_sessions} / utilisées ${p.used_sessions} / total ${p.total_sessions} — expire ${p.date_expiration || 'jamais'}`);
  });
  if (packages.filter((p) => p.statut === PACKAGE_STATUS.ACTIVE).length === 0) line('(aucun)', '');

  section('Forfaits en attente de paiement');
  packages.filter((p) => p.statut === PACKAGE_STATUS.PENDING_PAYMENT).forEach((p) => {
    line(p.package_id, `${p.nom_forfait} — ${p.total_sessions} séances — créé le ${formatDateForReport_(p.date_achat)}`);
  });
  if (packages.filter((p) => p.statut === PACKAGE_STATUS.PENDING_PAYMENT).length === 0) line('(aucun)', '');

  section('Forfaits passés (expirés / suspendus / terminés)');
  packages.filter((p) => [PACKAGE_STATUS.EXPIRED, PACKAGE_STATUS.SUSPENDED, PACKAGE_STATUS.COMPLETED].indexOf(p.statut) !== -1).forEach((p) => {
    line(p.package_id, `${p.nom_forfait} — statut ${p.statut} — utilisées ${p.used_sessions}/${p.total_sessions}`);
  });

  section('Rendez-vous futurs');
  bookings.filter((b) => b.status === BOOKING_STATUS.CONFIRMED && new Date(b.start_datetime) > now).forEach((b) => {
    line(b.booking_id, formatBookingLineForReport_(b));
  });

  section('Historique des rendez-vous passés');
  bookings.filter((b) => new Date(b.start_datetime) <= now || b.status === BOOKING_STATUS.EXTERNAL_MANUAL).forEach((b) => {
    line(b.booking_id, formatBookingLineForReport_(b));
  });

  section('Annulations, reports et no-shows');
  bookings.filter((b) => [
    BOOKING_STATUS.CANCELLED_AUTHORIZED, BOOKING_STATUS.NO_SHOW_OR_LATE_CANCEL, BOOKING_STATUS.RESCHEDULED,
  ].indexOf(b.status) !== -1).forEach((b) => {
    line(b.booking_id, `${b.status} — ${b.history_notes || ''}`);
  });

  section('Propositions de forfait envoyées');
  line('(Étape B — pas encore implémenté)', '');

  section('Paiements (brut / frais / net)');
  let totalBrut = 0, totalFrais = 0, totalNet = 0;
  payments.forEach((p) => {
    line(p.payment_id, `${p.montant_brut} ${p.devise} brut — ${p.frais_paiement} frais — ${Number(p.montant_net).toFixed(2)} net — ${p.moyen_paiement} — ${p.statut_paiement}`);
    if (p.statut_paiement === PAYMENT_STATUS.CONFIRME) {
      totalBrut += Number(p.montant_brut) || 0;
      totalFrais += Number(p.frais_paiement) || 0;
      totalNet += Number(p.montant_net) || 0;
    }
  });
  line('Total confirmé', `${totalBrut.toFixed(2)} brut — ${totalFrais.toFixed(2)} frais — ${totalNet.toFixed(2)} net`);

  return rows;
}

/** Ligne standard pour un Booking dans la Fiche_Client : date, soin, origine, forfait, statut, calendar_event_id, créé par. */
function formatBookingLineForReport_(b) {
  return `${b.service_id} — ${formatDateForReport_(b.start_datetime)} — ${b.status} — ` +
    `forfait : ${b.package_id || '(aucun, réservation externe)'} — origine : ${b.source || 'package_booking'} — ` +
    `calendar_event_id : ${b.calendar_event_id || '(aucun)'} — créé par : ${b.created_by || 'client'}`;
}

function formatDateForReport_(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return Utilities.formatDate(d, getSettings().timezone, 'yyyy-MM-dd HH:mm');
}
