/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   ELYSIAN PARIS — Réservation par forfait (V1)                        ║
 * ║                                                                       ║
 * ║   👉 UN SEUL fichier à créer et à coller (au lieu de 11).             ║
 * ║      Suis package-booking/README.md pour la suite (Sheet, calendrier ║
 * ║      dédié, déploiement en Web App).                                 ║
 * ║                                                                       ║
 * ║   🔒 Séparé de gmail-automation/ : aucun fichier, aucune donnée,      ║
 * ║      aucune autorisation en commun avec cette autre automatisation.  ║
 * ║                                                                       ║
 * ║   ⚠️ Ne touche à aucun de tes 6 Appointment Schedules payants         ║
 * ║      existants (Stripe via Google Calendar) — parcours totalement    ║
 * ║      séparé.                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ════════════════════════════════════════════════════════════════════════
//  SECTION 1 — CONSTANTS.gs
// ════════════════════════════════════════════════════════════════════════

const TABS = {
  SETTINGS: 'Settings',
  CLIENTS: 'Clients',
  PACKAGES: 'Packages',
  BOOKINGS: 'Bookings',
  VERIFICATION_CODES: 'Verification_Codes',
  SESSION_TOKENS: 'Session_Tokens',
  AUDIT_LOG: 'Audit_Log',
  RECONCILIATION_ISSUES: 'Reconciliation_Issues',
};

const HEADERS = {
  [TABS.SETTINGS]: ['key', 'value', 'notes'],

  [TABS.CLIENTS]: [
    'client_id', 'prenom', 'nom', 'email', 'telephone',
    'notes_admin', 'date_creation',
  ],

  [TABS.PACKAGES]: [
    'package_id', 'client_id', 'nom_forfait', 'soins_inclus',
    'total_sessions', 'available_sessions', 'reserved_sessions', 'used_sessions',
    'date_achat', 'date_expiration', 'moyen_paiement', 'statut', 'notes_admin',
  ],

  [TABS.BOOKINGS]: [
    'booking_id', 'booking_request_id', 'client_id', 'package_id', 'service_id',
    'status', 'calendar_event_id', 'start_datetime', 'end_datetime',
    'session_movement', 'created_at', 'updated_at', 'history_notes',
  ],

  [TABS.VERIFICATION_CODES]: [
    'email', 'code_hash', 'created_at', 'expires_at', 'used', 'attempts',
  ],

  [TABS.SESSION_TOKENS]: [
    'token_hash', 'client_id', 'package_id', 'created_at', 'expires_at',
    'used_for_booking_request_id',
  ],

  [TABS.AUDIT_LOG]: [
    'timestamp', 'acteur', 'action', 'entite',
    'ancienne_valeur', 'nouvelle_valeur', 'motif',
  ],

  [TABS.RECONCILIATION_ISSUES]: [
    'timestamp_detection', 'type_anomalie', 'entite_concernee',
    'details', 'statut', 'resolution_notes',
  ],
};

const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  CANCELLED_AUTHORIZED: 'cancelled_authorized',
  NO_SHOW_OR_LATE_CANCEL: 'no_show_or_late_cancel',
  RESCHEDULED: 'rescheduled',
};

const PACKAGE_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  COMPLETED: 'completed',
};

// ⬇️ Réglages par défaut. Une fois initializeSheets() lancé, modifie-les
// directement dans l'onglet Settings du Sheet — pas ici.
const SETTINGS_DEFAULTS = {
  calendar_id: '',                              // OBLIGATOIRE — jamais de calendrier par défaut implicite
  timezone: 'Europe/London',
  workday_start_hour: 9,
  workday_end_hour: 18,
  workdays: '1,2,3,4,5,6',                       // 1=lundi ... 7=dimanche
  appointment_buffer_minutes: 15,
  lookahead_days: 14,
  verification_code_validity_minutes: 10,
  session_token_validity_minutes: 15,
  cancellation_deadline_hours: 24,
  max_code_requests_per_hour: 5,
  max_code_attempts: 5,
  lockout_duration_minutes: 30,
  reconciliation_stale_pending_minutes: 15,
};

const DEFAULT_APPOINTMENT_MINUTES = 60;

// ════════════════════════════════════════════════════════════════════════
//  SECTION 2 — SheetSchema.gs (initialisation, à lancer une seule fois)
// ════════════════════════════════════════════════════════════════════════

function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let created = [];

  Object.keys(HEADERS).forEach((tabName) => {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      const headers = HEADERS[tabName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      created.push(tabName);
    }
  });

  const settingsSheet = ss.getSheetByName(TABS.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    const rows = Object.keys(SETTINGS_DEFAULTS).map((key) => [key, SETTINGS_DEFAULTS[key], '']);
    if (rows.length > 0) {
      settingsSheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
  }

  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Feuille 1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  const message = created.length > 0
    ? `Onglets créés : ${created.join(', ')}.\n\n⚠️ N'oublie pas de renseigner calendar_id dans l'onglet Settings avant tout test.`
    : 'Tous les onglets existent déjà — rien créé.';

  Logger.log(message);
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) { /* pas grave si getUi() indisponible ici */ }
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 3 — Settings.gs
// ════════════════════════════════════════════════════════════════════════

const SETTINGS_CACHE_KEY = 'elysian_settings_cache_v1';
const SETTINGS_CACHE_SECONDS = 60;

function getSettings() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(SETTINGS_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.SETTINGS);
  const settings = Object.assign({}, SETTINGS_DEFAULTS);

  if (sheet && sheet.getLastRow() > 1) {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    rows.forEach(([key, value]) => {
      if (!key) return;
      const k = String(key).trim();
      if (Object.prototype.hasOwnProperty.call(SETTINGS_DEFAULTS, k)) {
        const defaultVal = SETTINGS_DEFAULTS[k];
        settings[k] = (typeof defaultVal === 'number') ? Number(value) : String(value);
      }
    });
  }

  if (!settings.calendar_id) {
    throw new Error(
      "Configuration incomplète : 'calendar_id' est vide dans l'onglet Settings. " +
      "Renseigne l'ID du calendrier dédié Elysian avant d'utiliser le système."
    );
  }

  cache.put(SETTINGS_CACHE_KEY, JSON.stringify(settings), SETTINGS_CACHE_SECONDS);
  return settings;
}

function getWorkdaysArray(settings) {
  return String(settings.workdays).split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => !isNaN(d));
}

function clearSettingsCache() {
  CacheService.getScriptCache().remove(SETTINGS_CACHE_KEY);
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 4 — Security.gs (HMAC-SHA256, codes, rate limiting)
// ════════════════════════════════════════════════════════════════════════

function getHmacSecretKey_() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('SECURITY_HMAC_KEY');
  if (!key) {
    key = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SECURITY_HMAC_KEY', key);
  }
  return key;
}

function hashWithPepper_(value) {
  const digest = Utilities.computeHmacSha256Signature(value, getHmacSecretKey_(), Utilities.Charset.UTF_8);
  return digest.map((b) => {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function generateVerificationCode_() {
  const n = Math.floor(Math.random() * 1000000);
  return String(n).padStart(6, '0');
}

function generateSessionToken_() {
  return Utilities.getUuid() + '-' + Utilities.getUuid();
}

function enforceCodeRequestRateLimit_(email, settings) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS.VERIFICATION_CODES);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const rows = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[TABS.VERIFICATION_CODES].length).getValues()
    : [];
  const recentForEmail = rows.filter((r) => {
    const rowEmail = String(r[0]).toLowerCase();
    const createdAt = new Date(r[2]);
    return rowEmail === String(email).toLowerCase() && createdAt > oneHourAgo;
  });
  if (recentForEmail.length >= settings.max_code_requests_per_hour) {
    throw new RateLimitError_('Trop de demandes récentes. Réessaie plus tard.');
  }
}

function enforceNotLockedOut_(email, settings) {
  const props = PropertiesService.getScriptProperties();
  const key = 'lockout::' + String(email).toLowerCase();
  const lockedUntilRaw = props.getProperty(key);
  if (lockedUntilRaw) {
    const lockedUntil = new Date(lockedUntilRaw);
    if (lockedUntil > new Date()) {
      throw new RateLimitError_('Trop de tentatives. Réessaie plus tard.');
    }
  }
}

function recordFailedAttempt_(email, settings) {
  const props = PropertiesService.getScriptProperties();
  const countKey = 'failcount::' + String(email).toLowerCase();
  const count = parseInt(props.getProperty(countKey) || '0', 10) + 1;
  props.setProperty(countKey, String(count));
  if (count >= settings.max_code_attempts) {
    const lockedUntil = new Date(Date.now() + settings.lockout_duration_minutes * 60 * 1000);
    props.setProperty('lockout::' + String(email).toLowerCase(), lockedUntil.toISOString());
    props.deleteProperty(countKey);
  }
}

function clearFailedAttempts_(email) {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('failcount::' + String(email).toLowerCase());
  props.deleteProperty('lockout::' + String(email).toLowerCase());
}

function RateLimitError_(message) {
  this.name = 'RateLimitError';
  this.message = message;
}
RateLimitError_.prototype = Object.create(Error.prototype);

// ════════════════════════════════════════════════════════════════════════
//  SECTION 5 — DataAccess.gs
// ════════════════════════════════════════════════════════════════════════

function sheet_(tabName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
}

function colIndex_(tabName, columnName) {
  return HEADERS[tabName].indexOf(columnName);
}

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

function findRowBy_(tabName, columnName, value) {
  const rows = readAllRows_(tabName);
  const target = typeof value === 'string' ? value.toLowerCase() : value;
  return rows.find((r) => {
    const v = r[columnName];
    return (typeof v === 'string' ? v.toLowerCase() : v) === target;
  }) || null;
}

function updateRow_(tabName, rowNumber, updates) {
  const sh = sheet_(tabName);
  const headers = HEADERS[tabName];
  Object.keys(updates).forEach((col) => {
    const idx = headers.indexOf(col);
    if (idx === -1) throw new Error(`Colonne inconnue "${col}" dans ${tabName}`);
    sh.getRange(rowNumber, idx + 1).setValue(updates[col]);
  });
}

function appendRow_(tabName, rowObject) {
  const sh = sheet_(tabName);
  const headers = HEADERS[tabName];
  const row = headers.map((h) => (Object.prototype.hasOwnProperty.call(rowObject, h) ? rowObject[h] : ''));
  sh.appendRow(row);
  return sh.getLastRow();
}

function genId_(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

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

function findEligiblePackages_(clientId, serviceId) {
  const now = new Date();
  return readAllRows_(TABS.PACKAGES).filter((pkg) => {
    if (pkg.client_id !== clientId) return false;
    if (pkg.statut !== PACKAGE_STATUS.ACTIVE) return false;
    if (Number(pkg.available_sessions) < 1) return false;
    if (pkg.date_expiration) {
      const exp = new Date(pkg.date_expiration);
      if (!isNaN(exp.getTime()) && exp < now) return false;
    }
    const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
    if (included.indexOf(serviceId) === -1) return false;
    return true;
  });
}

function findBookingByRequestId_(bookingRequestId) {
  return findRowBy_(TABS.BOOKINGS, 'booking_request_id', bookingRequestId);
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 6 — Availability.gs
// ════════════════════════════════════════════════════════════════════════

function computeAvailableSlots(durationMinutes) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  if (!calendar) throw new Error("Calendrier introuvable pour l'ID configuré dans Settings.");

  const bufferMs = settings.appointment_buffer_minutes * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;
  const workdays = getWorkdaysArray(settings);

  const now = new Date();
  const rangeStart = new Date(now.getTime());
  const rangeEnd = new Date(now.getTime() + settings.lookahead_days * 24 * 60 * 60 * 1000);

  const existingEvents = calendar.getEvents(rangeStart, rangeEnd);
  const busyIntervals = existingEvents.map((e) => ({
    start: new Date(e.getStartTime().getTime() - bufferMs),
    end: new Date(e.getEndTime().getTime() + bufferMs),
  }));

  const slots = [];
  const cursor = new Date(rangeStart);
  cursor.setMinutes(0, 0, 0);
  while (cursor < rangeEnd) {
    const isoWeekday = ((cursor.getDay() + 6) % 7) + 1;
    const hour = cursor.getHours();

    if (workdays.indexOf(isoWeekday) !== -1 && hour >= settings.workday_start_hour && hour < settings.workday_end_hour && cursor > now) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + durationMs);
      const closingTime = new Date(cursor);
      closingTime.setHours(settings.workday_end_hour, 0, 0, 0);

      if (slotEnd <= closingTime) {
        const overlaps = busyIntervals.some((b) => slotStart < b.end && slotEnd > b.start);
        if (!overlaps) slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
    }
    cursor.setMinutes(cursor.getMinutes() + 30);
  }
  return slots;
}

function isSlotStillFree(startIso, endIso) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const bufferMs = settings.appointment_buffer_minutes * 60 * 1000;
  const start = new Date(new Date(startIso).getTime() - bufferMs);
  const end = new Date(new Date(endIso).getTime() + bufferMs);
  return calendar.getEvents(start, end).length === 0;
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 7 — Booking.gs (le cœur : workflow transactionnel)
// ════════════════════════════════════════════════════════════════════════

function BookingBusinessError_(message) {
  this.name = 'BookingBusinessError';
  this.message = message;
}
BookingBusinessError_.prototype = Object.create(Error.prototype);

function confirmPackageBooking(sessionTokenPlain, bookingRequestId, serviceId, startIso, endIso) {
  if (!sessionTokenPlain || !bookingRequestId || !serviceId || !startIso || !endIso) {
    throw new BookingBusinessError_('Requête incomplète.');
  }

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);
  if (!gotLock) throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');

  try {
    const existingBooking = findBookingByRequestId_(bookingRequestId);
    if (existingBooking) {
      if (existingBooking.status === BOOKING_STATUS.CONFIRMED) {
        return { status: 'confirmed', calendarEventId: existingBooking.calendar_event_id };
      }
      if (existingBooking.status === BOOKING_STATUS.FAILED) {
        throw new BookingBusinessError_('Cette tentative de réservation a échoué précédemment. Merci de choisir à nouveau un créneau.');
      }
      if (existingBooking.status === BOOKING_STATUS.PENDING) {
        return resumePendingBooking_(existingBooking);
      }
    }

    const tokenHash = hashWithPepper_(sessionTokenPlain);
    const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
    if (!tokenRow) throw new BookingBusinessError_('Session invalide, merci de recommencer la vérification.');
    if (new Date(tokenRow.expires_at) < new Date()) {
      throw new BookingBusinessError_('Session expirée, merci de recommencer la vérification.');
    }
    if (tokenRow.used_for_booking_request_id && tokenRow.used_for_booking_request_id !== bookingRequestId) {
      throw new BookingBusinessError_('Cette session a déjà été utilisée pour une autre réservation.');
    }

    const clientId = tokenRow.client_id;
    const packageId = tokenRow.package_id;

    const pkg = findPackageById_(packageId);
    if (!pkg || pkg.client_id !== clientId) throw new BookingBusinessError_('Forfait introuvable.');
    if (pkg.statut !== PACKAGE_STATUS.ACTIVE) throw new BookingBusinessError_('Ce forfait n\'est pas actif.');
    if (pkg.date_expiration) {
      const exp = new Date(pkg.date_expiration);
      if (!isNaN(exp.getTime()) && exp < new Date()) throw new BookingBusinessError_('Ce forfait est expiré.');
    }
    const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
    if (included.indexOf(serviceId) === -1) throw new BookingBusinessError_('Ce soin n\'est pas inclus dans ce forfait.');
    if (Number(pkg.available_sessions) < 1) throw new BookingBusinessError_('Aucune séance disponible sur ce forfait.');
    if (!isSlotStillFree(startIso, endIso)) {
      throw new BookingBusinessError_('Ce créneau vient d\'être réservé par quelqu\'un d\'autre. Merci d\'en choisir un autre.');
    }

    const bookingId = genId_('BKG');
    appendRow_(TABS.BOOKINGS, {
      booking_id: bookingId,
      booking_request_id: bookingRequestId,
      client_id: clientId,
      package_id: packageId,
      service_id: serviceId,
      status: BOOKING_STATUS.PENDING,
      calendar_event_id: '',
      start_datetime: startIso,
      end_datetime: endIso,
      session_movement: 'available -1 / reserved +1',
      created_at: new Date(),
      updated_at: new Date(),
      history_notes: '',
    });

    const packagesSheetRow = findPackageById_(packageId).rowNumber;
    updateRow_(TABS.PACKAGES, packagesSheetRow, {
      available_sessions: Number(pkg.available_sessions) - 1,
      reserved_sessions: Number(pkg.reserved_sessions) + 1,
    });

    SpreadsheetApp.flush();

    let event;
    try {
      event = createCalendarEventForBooking_(bookingId, clientId, serviceId, startIso, endIso);
    } catch (calendarError) {
      restoreFailedBooking_(bookingId, packageId, packagesSheetRow, calendarError);
      throw new BookingBusinessError_('La réservation n\'a pas pu être finalisée. Merci de réessayer.');
    }

    const bookingRow = findBookingByRequestId_(bookingRequestId);
    updateRow_(TABS.BOOKINGS, bookingRow.rowNumber, {
      calendar_event_id: event.getId(),
      status: BOOKING_STATUS.CONFIRMED,
      updated_at: new Date(),
    });
    updateRow_(TABS.SESSION_TOKENS, tokenRow.rowNumber, { used_for_booking_request_id: bookingRequestId });
    writeAuditLog_(clientId, 'create_booking', bookingId, '', 'confirmed', 'Réservation via forfait');

    return { status: 'confirmed', calendarEventId: event.getId() };
  } finally {
    lock.releaseLock();
  }
}

function createCalendarEventForBooking_(bookingId, clientId, serviceId, startIso, endIso) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const client = findRowBy_(TABS.CLIENTS, 'client_id', clientId);
  const clientLabel = client ? `${client.prenom} ${client.nom}` : clientId;

  return calendar.createEvent(
    `${serviceId} — ${clientLabel} (forfait)`,
    new Date(startIso),
    new Date(endIso),
    {
      description: `booking_id: ${bookingId}\nclient_id: ${clientId}\nservice: ${serviceId}\nRéservé via forfait prépayé.`,
      guests: client ? client.email : undefined,
      sendInvites: true,
    }
  );
}

function restoreFailedBooking_(bookingId, packageId, packagesSheetRow, error) {
  const pkg = findPackageById_(packageId);
  updateRow_(TABS.PACKAGES, packagesSheetRow, {
    available_sessions: Number(pkg.available_sessions) + 1,
    reserved_sessions: Number(pkg.reserved_sessions) - 1,
  });
  const bookingRow = findRowBy_(TABS.BOOKINGS, 'booking_id', bookingId);
  if (bookingRow) {
    updateRow_(TABS.BOOKINGS, bookingRow.rowNumber, {
      status: BOOKING_STATUS.FAILED,
      updated_at: new Date(),
      history_notes: `Échec création Calendar : ${error && error.message ? error.message : 'erreur inconnue'}`,
    });
  }
  writeAuditLog_('system', 'booking_failed_restored', bookingId, 'reserved', 'available', String(error));
}

function resumePendingBooking_(pendingBooking) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const found = searchCalendarEventByBookingId_(
    calendar, pendingBooking.booking_id,
    new Date(pendingBooking.start_datetime), new Date(pendingBooking.end_datetime)
  );

  if (found) {
    updateRow_(TABS.BOOKINGS, pendingBooking.rowNumber, {
      calendar_event_id: found.getId(),
      status: BOOKING_STATUS.CONFIRMED,
      updated_at: new Date(),
    });
    writeAuditLog_('system', 'resume_pending_adopted_event', pendingBooking.booking_id, 'pending', 'confirmed', 'Événement retrouvé au retry');
    return { status: 'confirmed', calendarEventId: found.getId() };
  }

  const packagesSheetRow = findPackageById_(pendingBooking.package_id).rowNumber;
  let event;
  try {
    event = createCalendarEventForBooking_(
      pendingBooking.booking_id, pendingBooking.client_id, pendingBooking.service_id,
      pendingBooking.start_datetime, pendingBooking.end_datetime
    );
  } catch (calendarError) {
    restoreFailedBooking_(pendingBooking.booking_id, pendingBooking.package_id, packagesSheetRow, calendarError);
    throw new BookingBusinessError_('La réservation n\'a pas pu être finalisée. Merci de réessayer.');
  }

  updateRow_(TABS.BOOKINGS, pendingBooking.rowNumber, {
    calendar_event_id: event.getId(),
    status: BOOKING_STATUS.CONFIRMED,
    updated_at: new Date(),
  });
  writeAuditLog_('system', 'resume_pending_created_event', pendingBooking.booking_id, 'pending', 'confirmed', 'Retry après interruption');
  return { status: 'confirmed', calendarEventId: event.getId() };
}

function searchCalendarEventByBookingId_(calendar, bookingId, approxStart, approxEnd) {
  const marginMs = 24 * 60 * 60 * 1000;
  const searchStart = new Date(approxStart.getTime() - marginMs);
  const searchEnd = new Date(approxEnd.getTime() + marginMs);
  const events = calendar.getEvents(searchStart, searchEnd);
  return events.find((e) => (e.getDescription() || '').indexOf(`booking_id: ${bookingId}`) !== -1) || null;
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 8 — PackageVerification.gs
// ════════════════════════════════════════════════════════════════════════

const GENERIC_CODE_REQUEST_MESSAGE =
  "Si cette adresse est associée à un forfait, un code de vérification vient d'être envoyé par email.";

function requestVerificationCode(email) {
  if (!email || String(email).indexOf('@') === -1) throw new BookingBusinessError_('Adresse email invalide.');
  const settings = getSettings();
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    enforceCodeRequestRateLimit_(normalizedEmail, settings);
  } catch (e) {
    if (e instanceof RateLimitError_) {
      writeAuditLog_(normalizedEmail, 'code_request_rate_limited', normalizedEmail, '', '', '');
      return { message: GENERIC_CODE_REQUEST_MESSAGE };
    }
    throw e;
  }

  const client = findClientByEmail_(normalizedEmail);
  const code = generateVerificationCode_();
  const codeHash = hashWithPepper_(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.verification_code_validity_minutes * 60 * 1000);

  appendRow_(TABS.VERIFICATION_CODES, {
    email: normalizedEmail, code_hash: codeHash, created_at: now, expires_at: expiresAt, used: false, attempts: 0,
  });

  if (client) {
    sendVerificationCodeEmail_(normalizedEmail, client.prenom, code, settings);
    writeAuditLog_(normalizedEmail, 'code_request_sent', client.client_id, '', '', '');
  } else {
    writeAuditLog_(normalizedEmail, 'code_request_unknown_email', normalizedEmail, '', '', '');
  }

  return { message: GENERIC_CODE_REQUEST_MESSAGE };
}

function sendVerificationCodeEmail_(email, prenom, code, settings) {
  const subject = 'Votre code de vérification — Elysian Paris';
  const body = [
    `Bonjour ${prenom || ''},`, '',
    `Voici votre code de vérification : ${code}`, '',
    `Ce code est valable ${settings.verification_code_validity_minutes} minutes et ne peut être utilisé qu'une seule fois.`, '',
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.", '',
    'Elysian Paris',
  ].join('\n');
  MailApp.sendEmail(email, subject, body);
}

function verifyCodeAndIssueToken(email, codePlain) {
  const settings = getSettings();
  const normalizedEmail = String(email).trim().toLowerCase();

  enforceNotLockedOut_(normalizedEmail, settings);

  const codeRows = readAllRows_(TABS.VERIFICATION_CODES)
    .filter((r) => String(r.email).toLowerCase() === normalizedEmail && !r.used)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const latest = codeRows[0];
  const providedHash = hashWithPepper_(String(codePlain).trim());
  const isValid = latest && latest.code_hash === providedHash && new Date(latest.expires_at) > new Date();

  if (!isValid) {
    recordFailedAttempt_(normalizedEmail, settings);
    if (latest) updateRow_(TABS.VERIFICATION_CODES, latest.rowNumber, { attempts: Number(latest.attempts || 0) + 1 });
    writeAuditLog_(normalizedEmail, 'code_verification_failed', normalizedEmail, '', '', '');
    throw new BookingBusinessError_('Code invalide ou expiré.');
  }

  updateRow_(TABS.VERIFICATION_CODES, latest.rowNumber, { used: true });
  clearFailedAttempts_(normalizedEmail);

  const client = findClientByEmail_(normalizedEmail);
  if (!client) throw new BookingBusinessError_('Vérification impossible.');

  const eligiblePackages = readAllRows_(TABS.PACKAGES).filter((pkg) => {
    if (pkg.client_id !== client.client_id) return false;
    if (pkg.statut !== PACKAGE_STATUS.ACTIVE) return false;
    if (Number(pkg.available_sessions) < 1) return false;
    if (pkg.date_expiration) {
      const exp = new Date(pkg.date_expiration);
      if (!isNaN(exp.getTime()) && exp < new Date()) return false;
    }
    return true;
  });

  if (eligiblePackages.length === 0) {
    writeAuditLog_(normalizedEmail, 'no_eligible_package', client.client_id, '', '', '');
    throw new BookingBusinessError_("Aucun forfait actif avec des séances disponibles n'a été trouvé pour ce compte.");
  }

  const chosenPackage = eligiblePackages[0];
  const tokenPlain = generateSessionToken_();
  const tokenHash = hashWithPepper_(tokenPlain);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.session_token_validity_minutes * 60 * 1000);

  appendRow_(TABS.SESSION_TOKENS, {
    token_hash: tokenHash, client_id: client.client_id, package_id: chosenPackage.package_id,
    created_at: now, expires_at: expiresAt, used_for_booking_request_id: '',
  });

  writeAuditLog_(normalizedEmail, 'code_verified_token_issued', client.client_id, '', '', '');

  return {
    sessionToken: tokenPlain,
    expiresInMinutes: settings.session_token_validity_minutes,
    eligibleServices: String(chosenPackage.soins_inclus || '').split(',').map((s) => s.trim()),
    packageName: chosenPackage.nom_forfait,
    availableSessions: Number(chosenPackage.available_sessions),
  };
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 9 — AdminMenu.gs
// ════════════════════════════════════════════════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Elysian Admin')
    .addItem('Ajouter une cliente', 'adminAddClient')
    .addItem('Ajouter un forfait', 'adminAddPackage')
    .addSeparator()
    .addItem('Ajuster le solde d\'un forfait', 'adminAdjustBalance')
    .addItem('Marquer une séance utilisée', 'adminMarkSessionUsed')
    .addItem('Restaurer une séance', 'adminRestoreSession')
    .addSeparator()
    .addItem('Reporter un rendez-vous', 'adminRescheduleBooking')
    .addItem('Annuler un rendez-vous (cliente)', 'adminCancelBookingByClient')
    .addItem('Annuler un rendez-vous (institut)', 'adminCancelBookingByInstitute')
    .addSeparator()
    .addItem('Prolonger / suspendre un forfait', 'adminExtendOrSuspendPackage')
    .addItem('Lancer la réconciliation maintenant', 'runReconciliationCheck')
    .addToUi();
}

function ui_() { return SpreadsheetApp.getUi(); }

function adminAddClient() {
  const ui = ui_();
  const prenom = ui.prompt('Prénom de la cliente :').getResponseText().trim();
  const nom = ui.prompt('Nom de la cliente :').getResponseText().trim();
  const email = ui.prompt('Email :').getResponseText().trim().toLowerCase();
  const telephone = ui.prompt('Téléphone (optionnel) :').getResponseText().trim();

  if (!email || email.indexOf('@') === -1) { ui.alert('Email invalide, opération annulée.'); return; }
  if (findClientByEmail_(email)) { ui.alert('Une cliente avec cet email existe déjà.'); return; }

  const clientId = genId_('CLI');
  appendRow_(TABS.CLIENTS, { client_id: clientId, prenom, nom, email, telephone, notes_admin: '', date_creation: new Date() });
  writeAuditLog_('admin', 'add_client', clientId, '', email, '');
  ui.alert(`Cliente ajoutée : ${clientId}`);
}

function adminAddPackage() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Aucune cliente avec cet email. Ajoute-la d\'abord.'); return; }

  const nomForfait = ui.prompt('Nom du forfait (ex. "Pack 5 séances Drainage") :').getResponseText().trim();
  const soinsInclus = ui.prompt('Soins inclus, séparés par des virgules (ex. lymphatic-1z, lymphatic-2z) :').getResponseText().trim();
  const totalSessionsRaw = ui.prompt('Nombre total de séances :').getResponseText().trim();
  const totalSessions = parseInt(totalSessionsRaw, 10);
  if (isNaN(totalSessions) || totalSessions <= 0) { ui.alert('Nombre de séances invalide, opération annulée.'); return; }
  const moyenPaiement = ui.prompt('Moyen de paiement (Stripe / ClassPass / carte / espèces / virement / autre) :').getResponseText().trim();
  const dateExpirationRaw = ui.prompt('Date d\'expiration (AAAA-MM-JJ), laisser vide si aucune :').getResponseText().trim();

  const packageId = genId_('PKG');
  appendRow_(TABS.PACKAGES, {
    package_id: packageId, client_id: client.client_id, nom_forfait: nomForfait, soins_inclus: soinsInclus,
    total_sessions: totalSessions, available_sessions: totalSessions, reserved_sessions: 0, used_sessions: 0,
    date_achat: new Date(), date_expiration: dateExpirationRaw || '', moyen_paiement: moyenPaiement,
    statut: PACKAGE_STATUS.ACTIVE, notes_admin: '',
  });
  writeAuditLog_('admin', 'add_package', packageId, '', `${totalSessions} séances`, '');
  ui.alert(`Forfait ajouté : ${packageId}`);
}

function adminAdjustBalance() {
  const ui = ui_();
  const packageId = ui.prompt('package_id à ajuster :').getResponseText().trim();
  const pkg = findPackageById_(packageId);
  if (!pkg) { ui.alert('Forfait introuvable.'); return; }

  const field = ui.prompt('Quel compteur ajuster ? (available_sessions / reserved_sessions / used_sessions)').getResponseText().trim();
  if (['available_sessions', 'reserved_sessions', 'used_sessions'].indexOf(field) === -1) { ui.alert('Compteur invalide.'); return; }
  const newValueRaw = ui.prompt(`Nouvelle valeur pour ${field} (actuel : ${pkg[field]}) :`).getResponseText().trim();
  const newValue = parseInt(newValueRaw, 10);
  if (isNaN(newValue) || newValue < 0) { ui.alert('Valeur invalide.'); return; }

  const motif = ui.prompt('Motif de cet ajustement (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire, opération annulée.'); return; }

  const oldValue = pkg[field];
  const updates = {};
  updates[field] = newValue;
  updateRow_(TABS.PACKAGES, pkg.rowNumber, updates);
  writeAuditLog_('admin', 'adjust_balance', packageId, `${field}=${oldValue}`, `${field}=${newValue}`, motif);
  ui.alert('Solde ajusté.');
}

function adminMarkSessionUsed() { adjustAfterAppointment_('used'); }
function adminRestoreSession() { adjustAfterAppointment_('restore'); }

function adjustAfterAppointment_(outcome) {
  const ui = ui_();
  const bookingId = ui.prompt('booking_id concerné :').getResponseText().trim();
  const booking = findRowBy_(TABS.BOOKINGS, 'booking_id', bookingId);
  if (!booking) { ui.alert('Rendez-vous introuvable.'); return; }
  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    ui.alert(`Ce rendez-vous n'est pas au statut confirmed (statut actuel : ${booking.status}).`);
    return;
  }

  const pkg = findPackageById_(booking.package_id);
  const motif = ui.prompt('Motif (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire.'); return; }

  if (outcome === 'used') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1, used_sessions: Number(pkg.used_sessions) + 1,
    });
    updateRow_(TABS.BOOKINGS, booking.rowNumber, { status: BOOKING_STATUS.NO_SHOW_OR_LATE_CANCEL, updated_at: new Date() });
  } else {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1, available_sessions: Number(pkg.available_sessions) + 1,
    });
    updateRow_(TABS.BOOKINGS, booking.rowNumber, { status: BOOKING_STATUS.CANCELLED_AUTHORIZED, updated_at: new Date() });
  }
  writeAuditLog_('admin', 'mark_session_' + outcome, bookingId, 'reserved', outcome, motif);
  ui.alert('Fait.');
}

function adminCancelBookingByClient() { cancelBooking_(false); }
function adminCancelBookingByInstitute() { cancelBooking_(true); }

function cancelBooking_(isInstituteInitiated) {
  const ui = ui_();
  const bookingId = ui.prompt('booking_id à annuler :').getResponseText().trim();
  const booking = findRowBy_(TABS.BOOKINGS, 'booking_id', bookingId);
  if (!booking) { ui.alert('Rendez-vous introuvable.'); return; }
  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    ui.alert(`Ce rendez-vous n'est pas au statut confirmed (statut actuel : ${booking.status}).`);
    return;
  }

  const settings = getSettings();
  const hoursUntilStart = (new Date(booking.start_datetime) - new Date()) / (60 * 60 * 1000);
  let outcome = isInstituteInitiated || hoursUntilStart >= settings.cancellation_deadline_hours ? 'restore' : 'used';

  let motif = '';
  if (!isInstituteInitiated && hoursUntilStart < settings.cancellation_deadline_hours) {
    const override = ui.alert(
      `Annulation tardive (${hoursUntilStart.toFixed(1)}h avant le RDV). Règle par défaut : séance considérée utilisée.\n\nVeux-tu déroger et la restaurer quand même ?`,
      ui.ButtonSet.YES_NO
    );
    if (override === ui.Button.YES) {
      outcome = 'restore';
      motif = ui.prompt('Motif de la dérogation (obligatoire) :').getResponseText().trim();
      if (!motif) { ui.alert('Motif obligatoire pour une dérogation, opération annulée.'); return; }
    }
  } else {
    motif = isInstituteInitiated ? 'Annulation à l\'initiative de l\'institut' : 'Annulation ≥ délai autorisé';
  }

  const settings2 = getSettings();
  const calendar = CalendarApp.getCalendarById(settings2.calendar_id);
  if (booking.calendar_event_id) {
    try {
      const event = calendar.getEventById(booking.calendar_event_id);
      if (event) event.deleteEvent();
    } catch (e) { /* déjà supprimé manuellement, on continue */ }
  }

  const pkg = findPackageById_(booking.package_id);
  if (outcome === 'restore') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1, available_sessions: Number(pkg.available_sessions) + 1,
    });
  } else {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1, used_sessions: Number(pkg.used_sessions) + 1,
    });
  }
  updateRow_(TABS.BOOKINGS, booking.rowNumber, {
    status: outcome === 'restore' ? BOOKING_STATUS.CANCELLED_AUTHORIZED : BOOKING_STATUS.NO_SHOW_OR_LATE_CANCEL,
    updated_at: new Date(),
    history_notes: `Annulation (${isInstituteInitiated ? 'institut' : 'cliente'}) — ${motif}`,
  });
  writeAuditLog_('admin', 'cancel_booking', bookingId, 'confirmed', outcome, motif);
  ui.alert(`Rendez-vous annulé. Séance : ${outcome === 'restore' ? 'restaurée' : 'considérée utilisée'}.`);
}

function adminRescheduleBooking() {
  const ui = ui_();
  const bookingId = ui.prompt('booking_id à reporter :').getResponseText().trim();
  const booking = findRowBy_(TABS.BOOKINGS, 'booking_id', bookingId);
  if (!booking) { ui.alert('Rendez-vous introuvable.'); return; }
  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    ui.alert(`Ce rendez-vous n'est pas au statut confirmed (statut actuel : ${booking.status}).`);
    return;
  }

  const newStartRaw = ui.prompt('Nouvelle date/heure de début (AAAA-MM-JJ HH:MM) :').getResponseText().trim();
  const newStart = new Date(newStartRaw.replace(' ', 'T'));
  if (isNaN(newStart.getTime())) { ui.alert('Date invalide.'); return; }

  const durationMs = new Date(booking.end_datetime) - new Date(booking.start_datetime);
  const newEnd = new Date(newStart.getTime() + durationMs);

  if (!isSlotStillFree(newStart.toISOString(), newEnd.toISOString())) { ui.alert('Ce créneau n\'est pas libre.'); return; }

  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  if (booking.calendar_event_id) {
    try {
      const oldEvent = calendar.getEventById(booking.calendar_event_id);
      if (oldEvent) oldEvent.deleteEvent();
    } catch (e) { /* déjà supprimé, on continue */ }
  }

  const newEvent = createCalendarEventForBooking_(
    booking.booking_id, booking.client_id, booking.service_id, newStart.toISOString(), newEnd.toISOString()
  );

  updateRow_(TABS.BOOKINGS, booking.rowNumber, {
    calendar_event_id: newEvent.getId(), start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString(),
    status: BOOKING_STATUS.CONFIRMED, updated_at: new Date(), history_notes: `Reporté depuis ${booking.start_datetime}`,
  });
  writeAuditLog_('admin', 'reschedule_booking', bookingId, booking.start_datetime, newStart.toISOString(), 'Report administrateur');
  ui.alert('Rendez-vous reporté, aucune séance supplémentaire consommée.');
}

function adminExtendOrSuspendPackage() {
  const ui = ui_();
  const packageId = ui.prompt('package_id concerné :').getResponseText().trim();
  const pkg = findPackageById_(packageId);
  if (!pkg) { ui.alert('Forfait introuvable.'); return; }

  const action = ui.prompt('Action : "extend" (nouvelle date d\'expiration) ou "suspend" ou "reactivate" :').getResponseText().trim();
  const motif = ui.prompt('Motif (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire.'); return; }

  if (action === 'extend') {
    const newDate = ui.prompt('Nouvelle date d\'expiration (AAAA-MM-JJ) :').getResponseText().trim();
    updateRow_(TABS.PACKAGES, pkg.rowNumber, { date_expiration: newDate });
    writeAuditLog_('admin', 'extend_package', packageId, pkg.date_expiration, newDate, motif);
  } else if (action === 'suspend') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, { statut: PACKAGE_STATUS.SUSPENDED });
    writeAuditLog_('admin', 'suspend_package', packageId, pkg.statut, PACKAGE_STATUS.SUSPENDED, motif);
  } else if (action === 'reactivate') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, { statut: PACKAGE_STATUS.ACTIVE });
    writeAuditLog_('admin', 'reactivate_package', packageId, pkg.statut, PACKAGE_STATUS.ACTIVE, motif);
  } else {
    ui.alert('Action inconnue.');
    return;
  }
  ui.alert('Forfait mis à jour.');
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 10 — Reconciliation.gs
// ════════════════════════════════════════════════════════════════════════

function runReconciliationCheck() {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const bookings = readAllRows_(TABS.BOOKINGS);
  const packages = readAllRows_(TABS.PACKAGES);
  const issues = [];

  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && !b.calendar_event_id)
    .forEach((b) => issues.push(['confirmed_without_event', b.booking_id, 'Booking confirmed sans calendar_event_id']));

  const lookaheadStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lookaheadEnd = new Date(Date.now() + settings.lookahead_days * 24 * 60 * 60 * 1000);
  const events = calendar.getEvents(lookaheadStart, lookaheadEnd);
  const eventsByBookingId = {};
  events.forEach((e) => {
    const desc = e.getDescription() || '';
    const match = desc.match(/booking_id:\s*(\S+)/);
    if (match) {
      const bId = match[1];
      if (!eventsByBookingId[bId]) eventsByBookingId[bId] = [];
      eventsByBookingId[bId].push(e);
    }
  });

  Object.keys(eventsByBookingId).forEach((bId) => {
    const matchingEvents = eventsByBookingId[bId];
    const booking = bookings.find((b) => b.booking_id === bId);

    if (matchingEvents.length > 1) {
      issues.push(['duplicate_calendar_events', bId, `${matchingEvents.length} événements Calendar référencent ce booking_id`]);
      return;
    }
    if (!booking) {
      issues.push(['orphan_calendar_event', bId, 'Événement Calendar sans ligne Booking correspondante']);
      return;
    }
    if (booking.status === BOOKING_STATUS.PENDING) {
      updateRow_(TABS.BOOKINGS, booking.rowNumber, {
        calendar_event_id: matchingEvents[0].getId(), status: BOOKING_STATUS.CONFIRMED, updated_at: new Date(),
      });
      writeAuditLog_('system', 'reconciliation_auto_complete', bId, 'pending', 'confirmed', 'Événement retrouvé, complétion automatique sûre');
    }
  });

  const now = new Date();
  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && new Date(b.end_datetime) < now)
    .forEach((b) => issues.push(['past_still_confirmed', b.booking_id, 'RDV passé, statut toujours confirmed — à traiter (utilisée / no-show)']));

  const requestIdCounts = {};
  bookings.forEach((b) => { requestIdCounts[b.booking_request_id] = (requestIdCounts[b.booking_request_id] || 0) + 1; });
  Object.keys(requestIdCounts).forEach((rid) => {
    if (requestIdCounts[rid] > 1) issues.push(['duplicate_booking_request_id', rid, `${requestIdCounts[rid]} lignes Bookings partagent ce booking_request_id`]);
  });

  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && b.calendar_event_id)
    .forEach((b) => {
      try {
        const event = calendar.getEventById(b.calendar_event_id);
        if (!event) issues.push(['event_deleted_externally', b.booking_id, 'Événement introuvable dans Calendar (supprimé hors système ?)']);
      } catch (e) {
        issues.push(['event_lookup_error', b.booking_id, String(e)]);
      }
    });

  packages.forEach((pkg) => {
    const total = Number(pkg.total_sessions);
    const sum = Number(pkg.available_sessions) + Number(pkg.reserved_sessions) + Number(pkg.used_sessions);
    if (total !== sum) issues.push(['session_count_mismatch', pkg.package_id, `total_sessions=${total} mais available+reserved+used=${sum}`]);

    const reservedBookingsCount = bookings.filter(
      (b) => b.package_id === pkg.package_id && b.status === BOOKING_STATUS.CONFIRMED && new Date(b.end_datetime) >= now
    ).length;
    if (reservedBookingsCount !== Number(pkg.reserved_sessions)) {
      issues.push(['reserved_count_mismatch', pkg.package_id, `reserved_sessions=${pkg.reserved_sessions} mais ${reservedBookingsCount} Bookings confirmed à venir`]);
    }
  });

  const staleThreshold = new Date(Date.now() - settings.reconciliation_stale_pending_minutes * 60 * 1000);
  bookings
    .filter((b) => b.status === BOOKING_STATUS.PENDING && !b.calendar_event_id && new Date(b.created_at) < staleThreshold)
    .forEach((b) => {
      const pkg = findPackageById_(b.package_id);
      if (pkg) {
        updateRow_(TABS.PACKAGES, pkg.rowNumber, {
          available_sessions: Number(pkg.available_sessions) + 1, reserved_sessions: Number(pkg.reserved_sessions) - 1,
        });
      }
      updateRow_(TABS.BOOKINGS, b.rowNumber, { status: BOOKING_STATUS.FAILED, updated_at: new Date() });
      writeAuditLog_('system', 'reconciliation_auto_restore_stale_pending', b.booking_id, 'pending', 'failed', 'pending ancien sans événement Calendar — restauration sûre');
    });

  issues.forEach(([type, entity, details]) => {
    appendRow_(TABS.RECONCILIATION_ISSUES, {
      timestamp_detection: new Date(), type_anomalie: type, entite_concernee: entity,
      details: details, statut: 'a_verifier', resolution_notes: '',
    });
  });

  Logger.log(`Réconciliation terminée : ${issues.length} anomalie(s) signalée(s).`);
  return issues.length;
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 11 — WebApp.gs (point d'entrée HTTP)
// ════════════════════════════════════════════════════════════════════════

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (parseError) {
    return jsonResponse_({ success: false, error: 'Requête invalide.' });
  }

  const action = body.action;

  try {
    let data;
    switch (action) {
      case 'request-code':
        data = requestVerificationCode(body.email);
        break;
      case 'verify-code':
        data = verifyCodeAndIssueToken(body.email, body.code);
        break;
      case 'get-slots':
        data = handleGetSlots_(body.sessionToken, body.serviceId, body.durationMinutes);
        break;
      case 'confirm-booking':
        data = confirmPackageBooking(body.sessionToken, body.bookingRequestId, body.serviceId, body.startIso, body.endIso);
        break;
      default:
        return jsonResponse_({ success: false, error: 'Action inconnue.' });
    }
    return jsonResponse_({ success: true, data: data });
  } catch (err) {
    if (err instanceof BookingBusinessError_ || err instanceof RateLimitError_) {
      return jsonResponse_({ success: false, error: err.message });
    }
    Logger.log('Erreur inattendue dans doPost (action=' + action + ') : ' + err + '\n' + err.stack);
    return jsonResponse_({ success: false, error: 'Une erreur est survenue, merci de réessayer.' });
  }
}

function doGet(e) {
  return jsonResponse_({ success: false, error: 'Cette Web App ne répond qu\'aux requêtes POST.' });
}

function handleGetSlots_(sessionTokenPlain, serviceId, durationMinutes) {
  if (!sessionTokenPlain) throw new BookingBusinessError_('Session invalide.');
  const tokenHash = hashWithPepper_(sessionTokenPlain);
  const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    throw new BookingBusinessError_('Session invalide ou expirée, merci de recommencer la vérification.');
  }

  const pkg = findPackageById_(tokenRow.package_id);
  const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
  if (included.indexOf(serviceId) === -1) throw new BookingBusinessError_('Ce soin n\'est pas inclus dans ce forfait.');

  const duration = Number(durationMinutes) || DEFAULT_APPOINTMENT_MINUTES;
  return { slots: computeAvailableSlots(duration) };
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
