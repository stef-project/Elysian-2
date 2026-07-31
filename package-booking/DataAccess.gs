/**
 * ============================================================================
 *  DATAACCESS.gs — Lecture/écriture partagées des onglets Clients, Packages,
 *  Bookings, Audit_Log. Utilisé par Booking.gs, PackageVerification.gs et
 *  AdminMenu.gs pour éviter de dupliquer la logique de recherche par ligne.
 * ============================================================================
 */

function sheet_(tabName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
}

function colIndex_(tabName, columnName) {
  return HEADERS[tabName].indexOf(columnName);
}

/** Lit toutes les lignes d'un onglet sous forme de tableau d'objets { colonne: valeur }, avec rowNumber (1-based, incluant l'en-tête). */
function readAllRows_(tabName) {
  const sh = sheet_(tabName);
  const headers = HEADERS[tabName];
  if (!sh || sh.getLastRow() <= 1) return [];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  return values.map((row, i) => {
    const obj = { rowNumber: i + 2 };
    headers.forEach((h, idx) => { obj[h] = row[idx]; });
    return obj;
  });
}

/** Trouve la première ligne d'un onglet où columnName === value (comparaison insensible à la casse pour les chaînes). */
function findRowBy_(tabName, columnName, value) {
  const rows = readAllRows_(tabName);
  const target = typeof value === 'string' ? value.toLowerCase() : value;
  return rows.find((r) => {
    const v = r[columnName];
    return (typeof v === 'string' ? v.toLowerCase() : v) === target;
  }) || null;
}

/** Met à jour des colonnes précises d'une ligne existante (par rowNumber). updates = { colonne: valeur }. */
function updateRow_(tabName, rowNumber, updates) {
  const sh = sheet_(tabName);
  const headers = HEADERS[tabName];
  Object.keys(updates).forEach((col) => {
    const idx = headers.indexOf(col);
    if (idx === -1) throw new Error(`Colonne inconnue "${col}" dans ${tabName}`);
    sh.getRange(rowNumber, idx + 1).setValue(updates[col]);
  });
}

/** Ajoute une nouvelle ligne à un onglet. rowObject = { colonne: valeur, ... } (colonnes absentes = vide). */
function appendRow_(tabName, rowObject) {
  const sh = sheet_(tabName);
  const headers = HEADERS[tabName];
  const row = headers.map((h) => (Object.prototype.hasOwnProperty.call(rowObject, h) ? rowObject[h] : ''));
  sh.appendRow(row);
  return sh.getLastRow();
}

/** Génère un identifiant lisible et unique, ex. genId_('PKG') -> "PKG-1719999999999-4821". */
function genId_(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

/** Écrit une ligne dans Audit_Log. À appeler pour CHAQUE modification de solde ou action sensible. */
function writeAuditLog_(acteur, action, entite, ancienneValeur, nouvelleValeur, motif) {
  appendRow_(TABS.AUDIT_LOG, {
    timestamp: new Date(),
    acteur: acteur || 'system',
    action: action,
    entite: entite,
    ancienne_valeur: ancienneValeur === undefined || ancienneValeur === null ? '' : String(ancienneValeur),
    nouvelle_valeur: nouvelleValeur === undefined || nouvelleValeur === null ? '' : String(nouvelleValeur),
    motif: motif || '',
  });
}

function findClientByEmail_(email) {
  return findRowBy_(TABS.CLIENTS, 'email', String(email).trim().toLowerCase());
}

function findPackageById_(packageId) {
  return findRowBy_(TABS.PACKAGES, 'package_id', packageId);
}

/** Un forfait est expiré si date_expiration est renseignée et dans le passé (référence = maintenant par défaut). */
function isPackageExpired_(pkg, referenceDate) {
  if (!pkg.date_expiration) return false;
  const exp = new Date(pkg.date_expiration);
  if (isNaN(exp.getTime())) return false;
  return exp < (referenceDate || new Date());
}

/** Renvoie les forfaits actifs d'un client couvrant un soin donné, avec au moins 1 séance disponible et non expirés. */
function findEligiblePackages_(clientId, serviceId) {
  return readAllRows_(TABS.PACKAGES).filter((pkg) => {
    if (pkg.client_id !== clientId) return false;
    if (pkg.statut !== PACKAGE_STATUS.ACTIVE) return false;
    if (Number(pkg.available_sessions) < 1) return false;
    if (isPackageExpired_(pkg)) return false;
    const included = String(pkg.soins_inclus || '')
      .split(',')
      .map((s) => s.trim());
    if (included.indexOf(serviceId) === -1) return false;
    return true;
  });
}

/** Forfaits actifs et non expirés d'un client, quel que soit le soin — utilisé par le formulaire admin (choix du forfait avant le soin). */
function findActivePackagesForClient_(clientId) {
  return readAllRows_(TABS.PACKAGES).filter((pkg) =>
    pkg.client_id === clientId && pkg.statut === PACKAGE_STATUS.ACTIVE && !isPackageExpired_(pkg)
  );
}

function findBookingByRequestId_(bookingRequestId) {
  return findRowBy_(TABS.BOOKINGS, 'booking_request_id', bookingRequestId);
}

/**
 * Protection contre les doublons pour les rendez-vous créés manuellement
 * (voir AdminMenu.gs → adminAddPackageBooking) : un Booking pending/confirmed
 * existe-t-il déjà pour la même cliente, le même forfait, le même soin et le
 * même horaire ? Empêche qu'une re-soumission du formulaire (avec un nouveau
 * booking_request_id, donc non couverte par l'idempotence classique) ne crée
 * un deuxième rendez-vous et ne déduise une deuxième séance.
 */
function findDuplicateActiveBooking_(clientId, packageId, serviceId, startIso) {
  return readAllRows_(TABS.BOOKINGS).find((b) =>
    b.client_id === clientId &&
    b.package_id === packageId &&
    b.service_id === serviceId &&
    b.start_datetime === startIso &&
    [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].indexOf(b.status) !== -1
  ) || null;
}

/** Normalise un numéro de téléphone pour comparaison (ne garde que chiffres et +). */
function normalizePhone_(raw) {
  return String(raw || '').replace(/[^0-9+]/g, '');
}

/** Recherche rapide de clientes par numéro de téléphone (peut renvoyer 0, 1 ou plusieurs résultats). */
function findClientsByPhone_(phone) {
  const normalized = normalizePhone_(phone);
  if (!normalized) return [];
  return readAllRows_(TABS.CLIENTS).filter((c) => normalizePhone_(c.telephone) === normalized);
}
