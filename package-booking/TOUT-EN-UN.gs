/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   ELYSIAN PARIS — Réservation par forfait (V1 + Phase 2 Étapes A/B/C) ║
 * ║                                                                       ║
 * ║   👉 UN SEUL fichier à créer et à coller (au lieu de 17).             ║
 * ║      Suis package-booking/README.md pour la suite (Sheet, calendrier ║
 * ║      dédié, déploiement en Web App).                                 ║
 * ║                                                                       ║
 * ║   🔒 Séparé de gmail-automation/ : aucun fichier, aucune donnée,      ║
 * ║      aucune autorisation en commun avec cette autre automatisation.  ║
 * ║                                                                       ║
 * ║   ⚠️ Ne touche à aucun de tes 6 Appointment Schedules payants         ║
 * ║      existants (Stripe via Google Calendar) — parcours totalement    ║
 * ║      séparé.                                                          ║
 * ║                                                                       ║
 * ║   Phase 2 Étape A (catalogue de forfaits, paiements, fiche cliente)  ║
 * ║   reste 100% côté administration (menu Sheet) : aucune nouvelle      ║
 * ║   route publique, aucun nouveau scope Google, rien d'exposé au site. ║
 * ║                                                                       ║
 * ║   Phase 2 Étape B ("Proposer un forfait") ajoute une route publique  ║
 * ║   (/offer/:offerId), gardée derrière VITE_PACKAGE_OFFER_ENABLED=false║
 * ║   tant que non testée — aucun nouveau scope Google non plus.        ║
 * ║                                                                       ║
 * ║   Phase 2 Étape C (confirmation post-achat, rappels de solde/        ║
 * ║   expiration, alertes de renouvellement admin, tableau de bord) —    ║
 * ║   100% côté administration/emails transactionnels, aucune nouvelle  ║
 * ║   route publique, aucun nouveau scope Google.                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ════════════════════════════════════════════════════════════════════════
//  SECTION 1 — CONSTANTS.gs
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  CONSTANTS.gs — Noms d'onglets, en-têtes de colonnes, clés de réglages.
 *  Fichier partagé par tous les autres — ne pas dupliquer ces valeurs ailleurs.
 * ============================================================================
 *
 *  Projet séparé de gmail-automation/ : celui-ci écrit dans Calendar et
 *  Sheets, l'autre est volontairement lecture seule / brouillons uniquement.
 *  Les deux ne partagent aucun état.
 */

const TABS = {
  SETTINGS: 'Settings',
  CLIENTS: 'Clients',
  PACKAGES: 'Packages',
  BOOKINGS: 'Bookings',
  VERIFICATION_CODES: 'Verification_Codes',
  SESSION_TOKENS: 'Session_Tokens',
  AUDIT_LOG: 'Audit_Log',
  RECONCILIATION_ISSUES: 'Reconciliation_Issues',
  // --- Phase 2, Étape A ---
  PACKAGE_TEMPLATES: 'Package_Templates',
  PAYMENTS: 'Payments',
  CLIENT_PROFILE_VIEW: 'Fiche_Client',
  // --- Phase 2, Étape B ---
  PACKAGE_OFFERS: 'Package_Offers',
  // --- Phase 2, Étape C ---
  REMINDERS_SENT: 'Reminders_Sent',
  DASHBOARD: 'Dashboard',
  DASHBOARD_HISTORY: 'Dashboard_History',
  // --- CRM ---
  CLIENT_NOTES: 'Client_Notes',
  CLIENT_SEARCH_RESULTS: 'Recherche_Clientes',
};

// En-têtes exacts de chaque onglet (ordre = ordre des colonnes).
// Ajouts Phase 2 toujours en fin de liste existante : additif, jamais de
// réordonnancement, pour ne jamais casser les lignes déjà écrites par la V1.
const HEADERS = {
  [TABS.SETTINGS]: ['key', 'value', 'notes'],

  [TABS.CLIENTS]: [
    'client_id', 'prenom', 'nom', 'email', 'telephone',
    'notes_admin', 'date_creation',
    'origine_premiere_reservation', 'consentement_marketing',
    'tags',
  ],

  [TABS.PACKAGES]: [
    'package_id', 'client_id', 'nom_forfait', 'soins_inclus',
    'total_sessions', 'available_sessions', 'reserved_sessions', 'used_sessions',
    'date_achat', 'date_expiration', 'moyen_paiement', 'statut', 'notes_admin',
    'package_template_id',
  ],

  [TABS.BOOKINGS]: [
    'booking_id', 'booking_request_id', 'client_id', 'package_id', 'service_id',
    'status', 'calendar_event_id', 'start_datetime', 'end_datetime',
    'session_movement', 'created_at', 'updated_at', 'history_notes',
    'source', 'created_by',
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

  // --- Phase 2, Étape A ---

  [TABS.PACKAGE_TEMPLATES]: [
    'package_template_id', 'nom', 'description', 'soins_inclus',
    'nombre_seances', 'prix_public', 'duree_validite_jours',
    'categorie', 'visibilite', 'statut', 'ordre_affichage', 'notes_internes',
  ],

  [TABS.PAYMENTS]: [
    'payment_id', 'client_id', 'package_id',
    'montant_brut', 'devise', 'moyen_paiement', 'fournisseur_paiement',
    'frais_paiement', 'montant_net', 'taux_frais',
    'date_paiement', 'reference_transaction', 'statut_paiement',
    'justificatif_notes', 'mode_saisie',
  ],

  // --- Phase 2, Étape B ---

  [TABS.PACKAGE_OFFERS]: [
    'offer_id', 'client_id', 'package_template_id',
    'nom_forfait', 'soins_inclus', 'nombre_seances', 'prix_final', 'duree_validite_jours',
    'moyen_paiement_propose', 'statut', 'token_hash',
    'date_proposition', 'date_expiration_lien', 'date_envoi', 'date_consultation', 'date_reponse',
    'notes_admin', 'package_id_resultant',
  ],

  // --- Phase 2, Étape C ---

  // Dédoublonnage des rappels envoyés : un (client_id, package_id, reminder_type)
  // donné n'est jamais écrit deux fois, donc jamais envoyé deux fois.
  [TABS.REMINDERS_SENT]: [
    'reminder_id', 'client_id', 'package_id', 'reminder_type', 'sent_at',
  ],

  // Historique des générations du tableau de bord (une ligne par génération)
  // — permet de suivre une tendance dans le temps (graphique natif Sheets).
  [TABS.DASHBOARD_HISTORY]: [
    'generated_at', 'offres_proposees', 'offres_payees', 'taux_conversion_offres',
    'ca_brut', 'ca_frais', 'ca_net', 'forfaits_actifs', 'seances_dues',
    'forfaits_proches_expiration', 'clientes_classpass', 'classpass_vers_direct',
    'taux_conversion_classpass',
  ],

  // --- CRM ---

  // Historique des notes admin par cliente — contrairement à Clients.notes_admin
  // (une note "épinglée", écrasée à chaque modification), chaque note ici
  // s'ajoute sans jamais écraser les précédentes.
  [TABS.CLIENT_NOTES]: [
    'note_id', 'client_id', 'timestamp', 'auteur', 'note',
  ],
};

// NB : TABS.CLIENT_PROFILE_VIEW ('Fiche_Client'), TABS.DASHBOARD ('Dashboard')
// et TABS.CLIENT_SEARCH_RESULTS ('Recherche_Clientes') n'ont volontairement
// pas d'entrée dans HEADERS — ce sont des onglets de rapport en texte libre,
// recréés à la demande (ClientProfile.gs / Dashboard.gs / CRM.gs), pas des
// sources de données tabulaires comme les autres onglets.

// Statuts possibles d'une réservation (Bookings.status).
const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  CANCELLED_AUTHORIZED: 'cancelled_authorized',
  NO_SHOW_OR_LATE_CANCEL: 'no_show_or_late_cancel',
  RESCHEDULED: 'rescheduled',
  EXTERNAL_MANUAL: 'external_manual', // saisie manuelle (ClassPass, WhatsApp...), hors saga Calendar
};

// Origine possible d'une réservation (Bookings.source) — libre, pour reporting uniquement.
const BOOKING_SOURCE = {
  CLASSPASS: 'classpass',
  GOOGLE_APPOINTMENT_PAID: 'google_appointment_paid',
  PACKAGE_BOOKING: 'package_booking',
  WHATSAPP: 'whatsapp',
  PHONE: 'phone',
  PACKAGE_CLIENT_REQUEST: 'package_client_request',
  ADMIN_MANUAL: 'admin_manual',
  OTHER: 'other',
};

// Statuts possibles d'un forfait (Packages.statut).
const PACKAGE_STATUS = {
  PENDING_PAYMENT: 'pending_payment', // créé, en attente de confirmation de paiement — non réservable
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  COMPLETED: 'completed',
};

// Statuts possibles d'un modèle de forfait (Package_Templates.statut).
const PACKAGE_TEMPLATE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

// Catégories de forfait (Package_Templates.categorie) — 3 catégories maximum au lancement.
const PACKAGE_TEMPLATE_CATEGORY = {
  DECOUVERTE: 'decouverte',
  PRINCIPAL: 'principal',
  PREMIUM: 'premium',
};

// Visibilité d'un modèle (Package_Templates.visibilite).
const PACKAGE_TEMPLATE_VISIBILITY = {
  PUBLIC: 'public',   // pourra un jour être publié sur le site, après validation explicite
  PRIVATE: 'private', // ex. programme premium : proposé uniquement par l'administratrice
};

// Moyens de paiement possibles (Payments.moyen_paiement).
const PAYMENT_METHOD = {
  REVOLUT_CARD: 'revolut_card_payment',
  REVOLUT_PAY: 'revolut_pay',
  BANK_TRANSFER: 'bank_transfer',
  STRIPE: 'stripe',
  CLASSPASS: 'classpass',
  CARD_IN_PERSON: 'card_in_person',
  CASH: 'cash',
  COMPLIMENTARY: 'complimentary',
  OTHER: 'other',
};

// Statuts possibles d'un paiement (Payments.statut_paiement).
const PAYMENT_STATUS = {
  A_CONFIRMER: 'a_confirmer',
  CONFIRME: 'confirme',
  REFUSE: 'refuse',
  REMBOURSE: 'rembourse',
};

// Mode de saisie d'un paiement (Payments.mode_saisie) — 'automatique' réservé à
// une future intégration API réelle ; en V1 de cette phase, toujours 'manuel'.
const PAYMENT_ENTRY_MODE = {
  MANUEL: 'manuel',
  AUTOMATIQUE: 'automatique',
};

// Statuts possibles d'une offre de forfait (Package_Offers.statut).
// Consulter ou accepter le lien ne fait JAMAIS passer un forfait à "active" —
// voir PackageOffers.gs. "paid" n'est atteint que via confirmation manuelle
// d'un paiement (Payments.gs), jamais automatiquement par l'ouverture du lien.
const OFFER_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  VIEWED: 'viewed',
  ACCEPTED: 'accepted',
  PAID: 'paid',
  EXPIRED: 'expired',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
};

// Clés de l'onglet Settings, avec valeurs par défaut si absentes.
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
  offer_default_validity_days: 14,               // durée de vie par défaut d'un lien d'offre
  site_base_url: 'https://www.elysian-institute.com', // pour construire les liens d'offre /offer/:id
  reminder_low_balance_thresholds: '3,1,0',      // séances restantes déclenchant un rappel
  reminder_days_before_expiration: '30,14,7',    // jours avant expiration déclenchant un rappel
};

// Durée par défaut d'un soin (minutes) si le site n'en précise pas — le site
// envoie toujours la durée exacte, ceci n'est qu'un filet de sécurité.
const DEFAULT_APPOINTMENT_MINUTES = 60;

// Types de rappels possibles (Reminders_Sent.reminder_type) — un seul endroit
// qui construit ces identifiants, pour que l'écriture et la vérification de
// dédoublonnage utilisent toujours exactement la même chaîne.
const REMINDER_TYPE = {
  POST_ACHAT: 'post_achat',
  balance: (sessionsRemaining) => `solde_${sessionsRemaining}`,
  expiration: (daysBefore) => `expiration_${daysBefore}j`,
  RENEWAL_ALERT: 'alerte_renouvellement',
};

// ════════════════════════════════════════════════════════════════════════
//  SECTION 2 — SheetSchema.gs (initialisation, à lancer une seule fois)
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  SHEETSCHEMA.gs — Création des onglets et de leurs en-têtes.
 *  À exécuter UNE SEULE FOIS, manuellement, à la mise en place (voir README).
 * ============================================================================
 */

/**
 * Crée tous les onglets nécessaires s'ils n'existent pas déjà, avec leurs
 * en-têtes de colonnes. Ne touche jamais à un onglet déjà existant (pas de
 * suppression, pas d'écrasement des données). Pré-remplit l'onglet Settings
 * avec les valeurs par défaut la première fois seulement.
 *
 * Fonction à lancer manuellement depuis l'éditeur Apps Script (menu déroulant
 * des fonctions → initializeSheets → ▶️ Exécuter), une seule fois.
 */
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

  // Pré-remplissage de Settings avec les valeurs par défaut (une seule fois).
  const settingsSheet = ss.getSheetByName(TABS.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    const rows = Object.keys(SETTINGS_DEFAULTS).map((key) => [
      key,
      SETTINGS_DEFAULTS[key],
      '',
    ]);
    if (rows.length > 0) {
      settingsSheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
  }

  // Supprime l'onglet "Feuille 1" / "Sheet1" par défaut s'il est vide et seul reste.
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
  } catch (e) {
    // getUi() indisponible en exécution depuis l'éditeur sans interface — pas grave, le Logger suffit.
  }
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 3 — Settings.gs
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  SETTINGS.gs — Lecture de l'onglet Settings, avec valeurs par défaut.
 * ============================================================================
 *
 *  ⚠️ Tous les réglages opérationnels vivent dans l'onglet Settings du Sheet,
 *  PAS en dur dans le code. Modifie-les directement dans le Sheet ; aucun
 *  redéploiement du script n'est nécessaire pour un changement de réglage.
 */

const SETTINGS_CACHE_KEY = 'elysian_settings_cache_v1';
const SETTINGS_CACHE_SECONDS = 60; // court : un changement dans le Sheet est pris en compte vite.

/**
 * Renvoie un objet { clé: valeur } à partir de l'onglet Settings, en
 * complétant les clés manquantes avec SETTINGS_DEFAULTS. Les valeurs
 * numériques déclarées comme telles dans SETTINGS_DEFAULTS sont converties
 * en Number ; le reste reste en chaîne.
 */
function getSettings() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(SETTINGS_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

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

/** Renvoie la liste des jours travaillés sous forme de tableau de nombres (1=lundi...7=dimanche). */
function getWorkdaysArray(settings) {
  return String(settings.workdays)
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d));
}

/** À appeler après toute modification manuelle de Settings pour forcer une relecture immédiate. */
function clearSettingsCache() {
  CacheService.getScriptCache().remove(SETTINGS_CACHE_KEY);
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 4 — Security.gs (HMAC-SHA256, codes, rate limiting)
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  SECURITY.gs — Hachage, codes de vérification, limitation de fréquence,
 *  jetons de session temporaires.
 * ============================================================================
 *
 *  Rien n'est jamais stocké en clair : les codes et les jetons sont hachés
 *  en HMAC-SHA256 (clé secrète propre à ce déploiement) avant écriture dans
 *  le Sheet. La clé vit uniquement dans les Propriétés du script — elle
 *  n'apparaît jamais dans Git/GitHub ni dans une cellule du Sheet.
 *
 *  ⚠️ HMAC, pas un simple SHA-256(valeur + secret) : un hachage simple avec
 *  secret concaténé est vulnérable aux attaques par extension de longueur
 *  (construction Merkle–Damgård de SHA-256). HMAC est le primitif conçu
 *  spécifiquement pour "hacher avec une clé secrète" et n'a pas cette faille.
 */

/** Renvoie la clé secrète HMAC, en la générant une seule fois si absente. */
function getHmacSecretKey_() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('SECURITY_HMAC_KEY');
  if (!key) {
    key = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SECURITY_HMAC_KEY', key);
  }
  return key;
}

/** Hache une chaîne (code ou jeton) en HMAC-SHA256 hexadécimal, avec la clé secrète du déploiement. */
function hashWithPepper_(value) {
  const digest = Utilities.computeHmacSha256Signature(
    value,
    getHmacSecretKey_(),
    Utilities.Charset.UTF_8
  );
  return digest.map((b) => {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/** Génère un code numérique à 6 chiffres (000000–999999), toujours sur 6 caractères. */
function generateVerificationCode_() {
  const n = Math.floor(Math.random() * 1000000);
  return String(n).padStart(6, '0');
}

/** Génère un jeton de session aléatoire (opaque, jamais stocké en clair). */
function generateSessionToken_() {
  return Utilities.getUuid() + '-' + Utilities.getUuid();
}

/**
 * Vérifie la limite de demandes de code pour un email (max_code_requests_per_hour).
 * Lève une erreur générique si la limite est atteinte. Ne révèle jamais si
 * l'email existe ou non dans Clients — c'est intentionnel (anti-énumération).
 */
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

/**
 * Vérifie qu'un email n'est pas actuellement bloqué après trop de tentatives
 * de code invalides (lockout_duration_minutes depuis le dernier échec).
 */
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

/** Enregistre une tentative échouée ; déclenche un blocage temporaire si le seuil est dépassé. */
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

/** Réinitialise le compteur d'échecs après une réussite. */
function clearFailedAttempts_(email) {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('failcount::' + String(email).toLowerCase());
  props.deleteProperty('lockout::' + String(email).toLowerCase());
}

/** Erreur dédiée pour les cas de rate limiting, distinguée des erreurs métier. */
function RateLimitError_(message) {
  this.name = 'RateLimitError';
  this.message = message;
}
RateLimitError_.prototype = Object.create(Error.prototype);

// ════════════════════════════════════════════════════════════════════════
//  SECTION 5 — DataAccess.gs
// ════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════
//  SECTION 6 — Availability.gs
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  AVAILABILITY.gs — Calcul des créneaux libres pour un soin donné.
 * ============================================================================
 *
 *  Utilise UNIQUEMENT le calendar_id configuré dans Settings — jamais
 *  CalendarApp.getDefaultCalendar().
 */

/**
 * Renvoie un tableau de créneaux libres { start, end } (objets Date) pour un
 * soin de durée donnée, sur la fenêtre configurée (lookahead_days), en
 * respectant horaires d'ouverture, jours travaillés et battement.
 *
 * @param {number} durationMinutes - durée du soin (envoyée par le site).
 */
function computeAvailableSlots(durationMinutes) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  if (!calendar) {
    throw new Error("Calendrier introuvable pour l'ID configuré dans Settings.");
  }

  const bufferMs = settings.appointment_buffer_minutes * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;
  const workdays = getWorkdaysArray(settings);

  const now = new Date();
  const rangeStart = new Date(now.getTime());
  const rangeEnd = new Date(now.getTime() + settings.lookahead_days * 24 * 60 * 60 * 1000);

  // On récupère tous les événements existants une seule fois (perf + cohérence).
  const existingEvents = calendar.getEvents(rangeStart, rangeEnd);
  const busyIntervals = existingEvents.map((e) => ({
    start: new Date(e.getStartTime().getTime() - bufferMs),
    end: new Date(e.getEndTime().getTime() + bufferMs),
  }));

  const slots = [];
  const cursor = new Date(rangeStart);
  cursor.setMinutes(0, 0, 0);
  // On avance d'heure en heure, en ne gardant que les créneaux qui tombent
  // dans les horaires d'ouverture d'un jour travaillé.
  while (cursor < rangeEnd) {
    const isoWeekday = ((cursor.getDay() + 6) % 7) + 1; // JS: 0=dimanche -> ISO: 7=dimanche
    const hour = cursor.getHours();

    if (
      workdays.indexOf(isoWeekday) !== -1 &&
      hour >= settings.workday_start_hour &&
      hour < settings.workday_end_hour &&
      cursor > now
    ) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + durationMs);

      // Le créneau doit se terminer avant la fermeture.
      const closingTime = new Date(cursor);
      closingTime.setHours(settings.workday_end_hour, 0, 0, 0);

      if (slotEnd <= closingTime) {
        const overlaps = busyIntervals.some(
          (b) => slotStart < b.end && slotEnd > b.start
        );
        if (!overlaps) {
          slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
        }
      }
    }

    cursor.setMinutes(cursor.getMinutes() + 30); // granularité des créneaux proposés : 30 min
  }

  return slots;
}

/**
 * Vérifie qu'un créneau précis est TOUJOURS libre à l'instant présent
 * (appelée juste avant la création de l'événement, sous verrou — voir
 * Booking.gs). Ne fait pas confiance à la liste affichée plus tôt au client.
 */
function isSlotStillFree(startIso, endIso) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const bufferMs = settings.appointment_buffer_minutes * 60 * 1000;

  const start = new Date(new Date(startIso).getTime() - bufferMs);
  const end = new Date(new Date(endIso).getTime() + bufferMs);

  const events = calendar.getEvents(start, end);
  return events.length === 0;
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 7 — Booking.gs (le cœur : workflow transactionnel)
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  BOOKING.gs — Le workflow transactionnel (cœur du système).
 * ============================================================================
 *
 *  Sheets et Calendar sont deux systèmes SANS transaction commune. Ce fichier
 *  gère donc explicitement les statuts intermédiaires (pending/confirmed/
 *  failed), l'idempotence par booking_request_id, et la récupération sûre
 *  en cas d'échec partiel. Voir le document de cadrage pour le détail des
 *  11 étapes — ce code les implémente une à une, dans l'ordre.
 *
 *  Erreur métier volontairement générique envoyée au client : jamais de
 *  trace technique (stack, message d'exception brut) ne sort de cette
 *  fonction vers le site.
 */

/** Erreur "propre" destinée à être affichée telle quelle côté client (message court, sans détail technique). */
function BookingBusinessError_(message) {
  this.name = 'BookingBusinessError';
  this.message = message;
}
BookingBusinessError_.prototype = Object.create(Error.prototype);

/**
 * Point d'entrée principal du parcours PUBLIC (site), appelé par WebApp.gs.
 *
 * @param {string} sessionTokenPlain - jeton reçu du client (en clair, jamais stocké tel quel).
 * @param {string} bookingRequestId - UUID généré côté site, unique par tentative de réservation.
 * @param {string} serviceId - identifiant du soin (doit correspondre à soins_inclus du forfait).
 * @param {string} startIso / endIso - créneau choisi (ISO 8601).
 * @returns {{status: string, calendarEventId: string}}
 */
function confirmPackageBooking(sessionTokenPlain, bookingRequestId, serviceId, startIso, endIso) {
  if (!sessionTokenPlain || !bookingRequestId || !serviceId || !startIso || !endIso) {
    throw new BookingBusinessError_('Requête incomplète.');
  }

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);
  if (!gotLock) {
    throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');
  }

  try {
    // --- Étape 3 : idempotence — cette demande a-t-elle déjà été traitée ? ---
    // (Volontairement AVANT la validation du jeton : une demande déjà
    // confirmed/pending/failed se résout par son booking_request_id seul,
    // sans dépendre à nouveau du jeton — comportement V1 inchangé.)
    const idempotent = resolveIdempotentBookingResult_(bookingRequestId);
    if (idempotent) return idempotent;

    // --- Étape 4 : validation du jeton de session ---
    const tokenHash = hashWithPepper_(sessionTokenPlain);
    const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
    if (!tokenRow) {
      throw new BookingBusinessError_('Session invalide, merci de recommencer la vérification.');
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      throw new BookingBusinessError_('Session expirée, merci de recommencer la vérification.');
    }
    if (tokenRow.used_for_booking_request_id && tokenRow.used_for_booking_request_id !== bookingRequestId) {
      throw new BookingBusinessError_('Cette session a déjà été utilisée pour une autre réservation.');
    }

    // --- Étapes 5 à 9 : cœur du saga, partagé avec le parcours admin (voir adminCreatePackageBooking_) ---
    const result = createNewPackageBooking_(tokenRow.client_id, tokenRow.package_id, serviceId, startIso, endIso, bookingRequestId, {
      source: BOOKING_SOURCE.PACKAGE_BOOKING,
      createdBy: 'client',
      auditActor: tokenRow.client_id,
      auditAction: 'create_booking',
      auditNote: 'Réservation via forfait',
    });

    updateRow_(TABS.SESSION_TOKENS, tokenRow.rowNumber, {
      used_for_booking_request_id: bookingRequestId,
    });

    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Point d'entrée du parcours ADMINISTRATEUR (menu "Ajouter un rendez-vous
 * forfait", AdminMenu.gs). Même cœur transactionnel que confirmPackageBooking
 * (createNewPackageBooking_) — rien n'est dupliqué. Pas de jeton de session
 * ici : l'administratrice a déjà identifié la cliente et le forfait
 * elle-même dans le formulaire.
 *
 * @param {{origin: string, actor: string, historyNotes: string}} meta
 */
function adminCreatePackageBooking_(clientId, packageId, serviceId, startIso, endIso, bookingRequestId, meta) {
  if (!clientId || !packageId || !serviceId || !startIso || !endIso || !bookingRequestId) {
    throw new BookingBusinessError_('Requête incomplète.');
  }

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);
  if (!gotLock) {
    throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');
  }

  try {
    const idempotent = resolveIdempotentBookingResult_(bookingRequestId);
    if (idempotent) return idempotent;

    const actor = (meta && meta.actor) || 'admin';
    return createNewPackageBooking_(clientId, packageId, serviceId, startIso, endIso, bookingRequestId, {
      source: (meta && meta.origin) || BOOKING_SOURCE.ADMIN_MANUAL,
      createdBy: actor,
      isAdminCreated: true,
      origin: meta && meta.origin,
      historyNotes: meta && meta.historyNotes,
      auditActor: actor,
      auditAction: 'admin_create_booking',
      auditNote: `Rendez-vous forfait ajouté manuellement (origine : ${(meta && meta.origin) || 'n/a'})` +
        (meta && meta.historyNotes ? ` — ${meta.historyNotes}` : ''),
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Étape 3 (idempotence), factorisée pour être partagée entre le parcours
 * public et le parcours admin : une demande portant un booking_request_id
 * déjà traité se résout uniquement par cet identifiant, sans re-jouer aucune
 * autre vérification. Renvoie null si aucune demande existante — dans ce cas
 * l'appelant doit continuer vers createNewPackageBooking_.
 */
function resolveIdempotentBookingResult_(bookingRequestId) {
  const existingBooking = findBookingByRequestId_(bookingRequestId);
  if (!existingBooking) return null;

  if (existingBooking.status === BOOKING_STATUS.CONFIRMED) {
    return { status: 'confirmed', calendarEventId: existingBooking.calendar_event_id };
  }
  if (existingBooking.status === BOOKING_STATUS.FAILED) {
    throw new BookingBusinessError_('Cette tentative de réservation a échoué précédemment. Merci de choisir à nouveau un créneau.');
  }
  if (existingBooking.status === BOOKING_STATUS.PENDING) {
    // Le process précédent a pu s'arrêter avant ou après la création
    // Calendar. On recherche un événement déjà créé avant de retenter,
    // pour ne JAMAIS en créer un deuxième pour la même demande.
    return resumePendingBooking_(existingBooking);
  }
  return null;
}

/**
 * Cœur du saga (étapes 5 à 9 du cadrage) : re-vérification complète, création
 * de la ligne Bookings en pending, déduction de séance, écriture Calendar,
 * confirmation ou restauration en cas d'échec. Appelé UNIQUEMENT depuis
 * l'intérieur d'un ScriptLock déjà acquis par l'appelant (confirmPackageBooking
 * ou adminCreatePackageBooking_) — ne verrouille pas lui-même.
 *
 * @param {{source: string, createdBy: string, isAdminCreated: boolean,
 *          origin: string, historyNotes: string, auditActor: string,
 *          auditAction: string, auditNote: string}} meta
 */
function createNewPackageBooking_(clientId, packageId, serviceId, startIso, endIso, bookingRequestId, meta) {
  // Re-vérification complète du forfait (jamais confiance dans ce qu'affiche le site ou saisit l'admin).
  const pkg = findPackageById_(packageId);
  if (!pkg || pkg.client_id !== clientId) {
    throw new BookingBusinessError_('Forfait introuvable.');
  }
  if (pkg.statut !== PACKAGE_STATUS.ACTIVE) {
    throw new BookingBusinessError_('Ce forfait n\'est pas actif.');
  }
  if (isPackageExpired_(pkg)) {
    throw new BookingBusinessError_('Ce forfait est expiré.');
  }
  const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
  if (included.indexOf(serviceId) === -1) {
    throw new BookingBusinessError_('Ce soin n\'est pas inclus dans ce forfait.');
  }
  if (Number(pkg.available_sessions) < 1) {
    throw new BookingBusinessError_('Aucune séance disponible sur ce forfait.');
  }
  if (!isSlotStillFree(startIso, endIso)) {
    throw new BookingBusinessError_('Ce créneau vient d\'être réservé par quelqu\'un d\'autre. Merci d\'en choisir un autre.');
  }
  if (findDuplicateActiveBooking_(clientId, packageId, serviceId, startIso)) {
    throw new BookingBusinessError_('Un rendez-vous identique existe déjà pour cette cliente.');
  }
  // Calendrier accessible ? Vérifié tôt, avant toute écriture Sheet, pour ne
  // jamais décrémenter une séance si le calendrier configuré est en réalité
  // introuvable/inaccessible (erreur de configuration plutôt qu'échec ponctuel).
  const settingsCheck = getSettings();
  if (!CalendarApp.getCalendarById(settingsCheck.calendar_id)) {
    throw new BookingBusinessError_('Calendrier configuré introuvable ou inaccessible. Contacte l\'administratrice.');
  }

  // --- Étape 5 : créer la ligne Bookings en pending ---
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
    history_notes: (meta && meta.historyNotes) || '',
    source: (meta && meta.source) || BOOKING_SOURCE.PACKAGE_BOOKING,
    created_by: (meta && meta.createdBy) || 'client',
  });

  // --- Étape 6 : available -1, reserved +1 ---
  const packagesSheetRow = findPackageById_(packageId).rowNumber;
  updateRow_(TABS.PACKAGES, packagesSheetRow, {
    available_sessions: Number(pkg.available_sessions) - 1,
    reserved_sessions: Number(pkg.reserved_sessions) + 1,
  });

  // --- Étape 7 : forcer l'écriture avant l'appel Calendar ---
  SpreadsheetApp.flush();

  // --- Étape 8 : créer l'événement Calendar ---
  let event;
  try {
    event = createCalendarEventForBooking_(bookingId, clientId, serviceId, startIso, endIso, meta);
  } catch (calendarError) {
    // --- Étape 10 : échec — restauration, jamais de confirmation ---
    restoreFailedBooking_(bookingId, packageId, packagesSheetRow, calendarError);
    throw new BookingBusinessError_('La réservation n\'a pas pu être finalisée. Merci de réessayer.');
  }

  // --- Étape 9 : succès — enregistrement + confirmation ---
  const bookingRow = findBookingByRequestId_(bookingRequestId);
  updateRow_(TABS.BOOKINGS, bookingRow.rowNumber, {
    calendar_event_id: event.getId(),
    status: BOOKING_STATUS.CONFIRMED,
    updated_at: new Date(),
  });
  writeAuditLog_(
    (meta && meta.auditActor) || clientId,
    (meta && meta.auditAction) || 'create_booking',
    bookingId, '', 'confirmed',
    (meta && meta.auditNote) || 'Réservation via forfait'
  );

  return { status: 'confirmed', calendarEventId: event.getId() };
}

/**
 * Crée l'événement Calendar avec une référence traçable au booking_id dans
 * la description. Le comportement du parcours PUBLIC (client) est
 * inchangé bit pour bit (même titre, même description) — la description
 * enrichie (téléphone, email, origine) n'apparaît que pour les rendez-vous
 * créés par l'administratrice (meta.isAdminCreated), jamais dans le titre.
 *
 * ⚠️ "Zone privée" imparfaite : ceci utilise le service CalendarApp de
 * base, où la description est visible par les invités (ici, uniquement la
 * cliente elle-même — jamais un tiers). Une vraie zone privée invisible
 * même à la cliente nécessiterait le service avancé Calendar (extendedProperties.private),
 * qui changerait la façon dont les événements sont créés dans tout ce
 * fichier — non fait ici pour ne pas fragiliser la V1 ; amélioration
 * possible plus tard si besoin réel.
 */
function createCalendarEventForBooking_(bookingId, clientId, serviceId, startIso, endIso, meta) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const client = findRowBy_(TABS.CLIENTS, 'client_id', clientId);
  const clientLabel = client ? `${client.prenom} ${client.nom}` : clientId;

  let description = `booking_id: ${bookingId}\nclient_id: ${clientId}\nservice: ${serviceId}\n`;
  if (meta && meta.isAdminCreated) {
    if (meta.origin) description += `origine: ${meta.origin}\n`;
    if (client && client.telephone) description += `telephone: ${client.telephone}\n`;
    if (client && client.email) description += `email: ${client.email}\n`;
    description += 'Rendez-vous forfait ajouté manuellement par l\'administratrice.';
  } else {
    description += 'Réservé via forfait prépayé.';
  }

  return calendar.createEvent(
    `${serviceId} — ${clientLabel} (forfait)`,
    new Date(startIso),
    new Date(endIso),
    {
      description: description,
      guests: client && client.email ? client.email : undefined,
      sendInvites: true,
    }
  );
}

/** Restaure une séance après échec de création Calendar (étape 10 du workflow). */
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

/**
 * Reprend une réservation restée en "pending" (process précédent interrompu).
 * Recherche d'abord si l'événement Calendar a bien été créé avant de retenter
 * — ne crée JAMAIS un deuxième événement pour la même demande.
 */
function resumePendingBooking_(pendingBooking) {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const found = searchCalendarEventByBookingId_(
    calendar,
    pendingBooking.booking_id,
    new Date(pendingBooking.start_datetime),
    new Date(pendingBooking.end_datetime)
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

  // Aucun événement trouvé : sûr de continuer la création maintenant.
  // Reconstruit un meta minimal à partir de la ligne Bookings elle-même
  // (source/created_by déjà enregistrés à l'étape 5), pour que la
  // description reste cohérente même si la création reprend après coupure.
  const reconstructedMeta = {
    isAdminCreated: !!(pendingBooking.created_by && pendingBooking.created_by !== 'client'),
    origin: pendingBooking.source,
  };
  const packagesSheetRow = findPackageById_(pendingBooking.package_id).rowNumber;
  let event;
  try {
    event = createCalendarEventForBooking_(
      pendingBooking.booking_id,
      pendingBooking.client_id,
      pendingBooking.service_id,
      pendingBooking.start_datetime,
      pendingBooking.end_datetime,
      reconstructedMeta
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

/**
 * Recherche, parmi les événements du calendrier proches du créneau attendu,
 * celui dont la description contient "booking_id: <id>". Réutilisé par
 * Reconciliation.gs.
 */
function searchCalendarEventByBookingId_(calendar, bookingId, approxStart, approxEnd) {
  const marginMs = 24 * 60 * 60 * 1000; // marge large pour tolérer un léger décalage éventuel
  const searchStart = new Date(approxStart.getTime() - marginMs);
  const searchEnd = new Date(approxEnd.getTime() + marginMs);
  const events = calendar.getEvents(searchStart, searchEnd);
  return events.find((e) => {
    const desc = e.getDescription() || '';
    return desc.indexOf(`booking_id: ${bookingId}`) !== -1;
  }) || null;
}

/**
 * Extrait le booking_id du marqueur "booking_id: <id>" dans une description
 * d'événement Calendar, ou null si absent. Convention partagée par
 * createCalendarEventForBooking_ (écriture), Reconciliation.gs et
 * AdminMenu.gs → adminLinkCalendarEventToPackage (lecture) — un seul endroit
 * qui connaît le format exact du marqueur.
 */
function extractBookingIdFromDescription_(description) {
  const match = String(description || '').match(/booking_id:\s*(\S+)/);
  return match ? match[1] : null;
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 8 — PackageVerification.gs
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  PACKAGEVERIFICATION.gs — Vérification d'identité par email + code.
 * ============================================================================
 *
 *  Réponses volontairement génériques : on ne révèle jamais si un email
 *  existe ou non dans le registre (anti-énumération).
 */

/**
 * Étape 1 du parcours cliente : demande d'un code de vérification.
 * Renvoie TOUJOURS le même message de succès générique, que l'email soit
 * connu ou non — seul un email réellement enregistré recevra un vrai code.
 */
function requestVerificationCode(email) {
  if (!email || String(email).indexOf('@') === -1) {
    throw new BookingBusinessError_('Adresse email invalide.');
  }
  const settings = getSettings();
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    enforceCodeRequestRateLimit_(normalizedEmail, settings);
  } catch (e) {
    if (e instanceof RateLimitError_) {
      // Réponse générique même en cas de rate limit — on ne distingue pas
      // ce cas d'un succès aux yeux du client, pour ne rien révéler.
      writeAuditLog_(normalizedEmail, 'code_request_rate_limited', normalizedEmail, '', '', '');
      return { message: GENERIC_CODE_REQUEST_MESSAGE };
    }
    throw e;
  }

  const client = findClientByEmail_(normalizedEmail);

  // Toujours écrire une ligne (même si email inconnu) pour que le timing de
  // réponse ne révèle rien — mais le mail n'est envoyé QUE si le client existe.
  const code = generateVerificationCode_();
  const codeHash = hashWithPepper_(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.verification_code_validity_minutes * 60 * 1000);

  appendRow_(TABS.VERIFICATION_CODES, {
    email: normalizedEmail,
    code_hash: codeHash,
    created_at: now,
    expires_at: expiresAt,
    used: false,
    attempts: 0,
  });

  if (client) {
    sendVerificationCodeEmail_(normalizedEmail, client.prenom, code, settings);
    writeAuditLog_(normalizedEmail, 'code_request_sent', client.client_id, '', '', '');
  } else {
    writeAuditLog_(normalizedEmail, 'code_request_unknown_email', normalizedEmail, '', '', '');
  }

  return { message: GENERIC_CODE_REQUEST_MESSAGE };
}

const GENERIC_CODE_REQUEST_MESSAGE =
  "Si cette adresse est associée à un forfait, un code de vérification vient d'être envoyé par email.";

/** Envoi du code — MailApp uniquement (scope minimal script.send_mail, aucun accès à la boîte mail). */
function sendVerificationCodeEmail_(email, prenom, code, settings) {
  const subject = 'Votre code de vérification — Elysian Paris';
  const body = [
    `Bonjour ${prenom || ''},`,
    '',
    `Voici votre code de vérification : ${code}`,
    '',
    `Ce code est valable ${settings.verification_code_validity_minutes} minutes et ne peut être utilisé qu'une seule fois.`,
    '',
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
    '',
    'Elysian Paris',
  ].join('\n');

  MailApp.sendEmail(email, subject, body);
}

/**
 * Étape 2 du parcours cliente : vérification du code saisi.
 * En cas de succès, émet un jeton de session temporaire et renvoie la liste
 * des forfaits/soins éligibles pour cette cliente (jamais l'inverse : on ne
 * renvoie rien tant que le code n'est pas validé).
 */
function verifyCodeAndIssueToken(email, codePlain) {
  const settings = getSettings();
  const normalizedEmail = String(email).trim().toLowerCase();

  enforceNotLockedOut_(normalizedEmail, settings);

  const codeRows = readAllRows_(TABS.VERIFICATION_CODES)
    .filter((r) => String(r.email).toLowerCase() === normalizedEmail && !r.used)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const latest = codeRows[0];
  const providedHash = hashWithPepper_(String(codePlain).trim());

  const isValid = latest
    && latest.code_hash === providedHash
    && new Date(latest.expires_at) > new Date();

  if (!isValid) {
    recordFailedAttempt_(normalizedEmail, settings);
    if (latest) {
      updateRow_(TABS.VERIFICATION_CODES, latest.rowNumber, { attempts: Number(latest.attempts || 0) + 1 });
    }
    writeAuditLog_(normalizedEmail, 'code_verification_failed', normalizedEmail, '', '', '');
    throw new BookingBusinessError_('Code invalide ou expiré.');
  }

  // Succès : marquer le code utilisé, réinitialiser le compteur d'échecs.
  updateRow_(TABS.VERIFICATION_CODES, latest.rowNumber, { used: true });
  clearFailedAttempts_(normalizedEmail);

  const client = findClientByEmail_(normalizedEmail);
  if (!client) {
    // Ne devrait jamais arriver (un code n'est envoyé que si le client existe),
    // mais on reste défensif et générique.
    throw new BookingBusinessError_('Vérification impossible.');
  }

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

  // Un jeton par forfait éligible (le site laissera choisir le soin ; en V1,
  // on prend le premier forfait éligible s'il n'y en a qu'un, sinon le site
  // demandera lequel utiliser).
  const chosenPackage = eligiblePackages[0];
  const tokenPlain = generateSessionToken_();
  const tokenHash = hashWithPepper_(tokenPlain);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.session_token_validity_minutes * 60 * 1000);

  appendRow_(TABS.SESSION_TOKENS, {
    token_hash: tokenHash,
    client_id: client.client_id,
    package_id: chosenPackage.package_id,
    created_at: now,
    expires_at: expiresAt,
    used_for_booking_request_id: '',
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

/**
 * ============================================================================
 *  ADMINMENU.gs — Menu "Elysian Admin" dans le Google Sheet.
 * ============================================================================
 *
 *  Interface d'administration V1 : le Sheet lui-même, enrichi de ce menu.
 *  Contrôle d'accès = permissions de partage du Sheet (personne d'autre que
 *  les comptes que tu autorises ne peut ouvrir ce fichier).
 *  Toute modification de solde ou de statut passe par writeAuditLog_.
 */

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
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Catalogue de forfaits (Phase 2)')
      .addItem('Ajouter un modèle de forfait', 'adminAddPackageTemplate')
      .addItem('Modifier un modèle de forfait', 'adminEditPackageTemplate')
      .addItem('Activer / désactiver un modèle', 'adminSetPackageTemplateStatus'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Paiements (Phase 2)')
      .addItem('Enregistrer un paiement', 'adminRecordPayment')
      .addItem('Confirmer un paiement en attente', 'adminConfirmPayment')
      .addItem('Marquer un paiement refusé', 'adminMarkPaymentRefused'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Fiche cliente (Phase 2)')
      .addItem('Voir la fiche consolidée d\'une cliente', 'adminViewClientProfile')
      .addItem('Ajouter une réservation manuelle (ClassPass / WhatsApp)', 'adminAddManualBooking'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Rendez-vous forfait (Phase 2)')
      .addItem('Ajouter un rendez-vous forfait', 'adminAddPackageBooking')
      .addItem('Associer un événement Calendar existant à un forfait', 'adminLinkCalendarEventToPackage'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Offres de forfait (Phase 2, Étape B)')
      .addItem('Proposer un forfait', 'adminCreatePackageOffer')
      .addItem('Marquer une offre comme envoyée', 'adminMarkOfferSent')
      .addItem('Convertir une offre acceptée en forfait', 'adminConvertOfferToPackage')
      .addItem('Annuler une offre', 'adminCancelOffer'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Notifications & Tableau de bord (Phase 2, Étape C)')
      .addItem('Lancer les notifications quotidiennes maintenant', 'runDailyNotifications')
      .addItem('Générer le tableau de bord', 'adminGenerateDashboard'))
    .addSubMenu(SpreadsheetApp.getUi().createMenu('CRM')
      .addItem('Ajouter un tag à une cliente', 'adminAddClientTag')
      .addItem('Retirer un tag d\'une cliente', 'adminRemoveClientTag')
      .addItem('Ajouter une note à l\'historique', 'adminAddClientNote')
      .addItem('Rechercher des clientes', 'adminSearchClients'))
    .addToUi();
}

function ui_() { return SpreadsheetApp.getUi(); }

function adminAddClient() {
  const ui = ui_();
  const prenom = ui.prompt('Prénom de la cliente :').getResponseText().trim();
  const nom = ui.prompt('Nom de la cliente :').getResponseText().trim();
  const email = ui.prompt('Email :').getResponseText().trim().toLowerCase();
  const telephone = ui.prompt('Téléphone (optionnel) :').getResponseText().trim();

  if (!email || email.indexOf('@') === -1) {
    ui.alert('Email invalide, opération annulée.');
    return;
  }
  if (findClientByEmail_(email)) {
    ui.alert('Une cliente avec cet email existe déjà.');
    return;
  }

  const clientId = genId_('CLI');
  appendRow_(TABS.CLIENTS, {
    client_id: clientId, prenom, nom, email, telephone,
    notes_admin: '', date_creation: new Date(),
  });
  writeAuditLog_('admin', 'add_client', clientId, '', email, '');
  ui.alert(`Cliente ajoutée : ${clientId}`);
}

/**
 * Attribue un forfait à une cliente. Peut sourcer les valeurs depuis un
 * modèle du catalogue (Package_Templates) — dans ce cas les valeurs sont
 * COPIÉES telles quelles à cet instant (voir en-tête PackageTemplates.gs) —
 * ou être saisies manuellement comme en V1.
 *
 * Le forfait est TOUJOURS créé au statut PENDING_PAYMENT (non réservable —
 * findEligiblePackages_/confirmPackageBooking exigent statut === ACTIVE),
 * puis deux parcours administratifs au choix :
 *
 *  1. "Paiement à recevoir" — le forfait reste pending_payment ; utiliser
 *     ensuite "Enregistrer un paiement" une fois le paiement reçu.
 *  2. "Paiement déjà reçu / forfait historique" — la saisie du paiement
 *     (moyen, brut, frais, référence) se fait immédiatement ici même, via
 *     promptAndRecordPayment_ (Payments.gs, pas dupliqué), et le forfait
 *     passe à ACTIVE dans la foulée. Couvre : historique, Revolut déjà
 *     reçu, virement déjà reçu, carte sur place, espèces, ClassPass, offert
 *     (complimentary), autre paiement externe.
 *
 * Dans tous les cas, aucun forfait n'est jamais activé sans une ligne
 * Payments (trace) — voir Payments.gs pour le motif obligatoire sur les
 * moyens peu traçables (cash / complimentary / other).
 */
function adminAddPackage() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) {
    ui.alert('Aucune cliente avec cet email. Ajoute-la d\'abord.');
    return;
  }

  const templateId = ui.prompt(
    'package_template_id à utiliser (laisser vide pour saisie manuelle comme avant) :'
  ).getResponseText().trim();

  let nomForfait, soinsInclus, totalSessions, dateExpirationRaw = '';

  if (templateId) {
    const tpl = findPackageTemplateById_(templateId);
    if (!tpl) { ui.alert('Modèle introuvable.'); return; }
    nomForfait = tpl.nom;
    soinsInclus = tpl.soins_inclus;
    totalSessions = Number(tpl.nombre_seances);
    if (tpl.duree_validite_jours) {
      const exp = new Date(Date.now() + Number(tpl.duree_validite_jours) * 24 * 60 * 60 * 1000);
      dateExpirationRaw = Utilities.formatDate(exp, getSettings().timezone, 'yyyy-MM-dd');
    }
    ui.alert(`Modèle "${tpl.nom}" : ${totalSessions} séances, ${tpl.prix_public} prix public. Ajuste si besoin aux étapes suivantes.`);
  } else {
    nomForfait = ui.prompt('Nom du forfait (ex. "Pack 5 séances Drainage") :').getResponseText().trim();
    soinsInclus = ui.prompt('Soins inclus, séparés par des virgules (ex. lymphatic-1z, lymphatic-2z) :').getResponseText().trim();
    const totalSessionsRaw = ui.prompt('Nombre total de séances :').getResponseText().trim();
    totalSessions = parseInt(totalSessionsRaw, 10);
    if (isNaN(totalSessions) || totalSessions <= 0) {
      ui.alert('Nombre de séances invalide, opération annulée.');
      return;
    }
    dateExpirationRaw = ui.prompt('Date d\'expiration (AAAA-MM-JJ), laisser vide si aucune :').getResponseText().trim();
  }

  const dejaRecu = ui.alert(
    'Ce paiement est-il déjà reçu (historique, Revolut, virement, carte sur place, espèces, ' +
    'ClassPass, offert, autre) ?\n\nOUI = saisie du paiement maintenant, forfait activé immédiatement.\n' +
    'NON = forfait créé "en attente de paiement", à activer plus tard via "Enregistrer un paiement".',
    ui.ButtonSet.YES_NO
  );

  const packageId = genId_('PKG');
  appendRow_(TABS.PACKAGES, {
    package_id: packageId,
    client_id: client.client_id,
    nom_forfait: nomForfait,
    soins_inclus: soinsInclus,
    total_sessions: totalSessions,
    available_sessions: totalSessions,
    reserved_sessions: 0,
    used_sessions: 0,
    date_achat: new Date(),
    date_expiration: dateExpirationRaw || '',
    moyen_paiement: '',
    statut: PACKAGE_STATUS.PENDING_PAYMENT,
    notes_admin: '',
    package_template_id: templateId || '',
  });
  writeAuditLog_('admin', 'add_package', packageId, '', `${totalSessions} séances (pending_payment)`, '');

  if (dejaRecu !== ui.Button.YES) {
    ui.alert(`Forfait créé : ${packageId} — statut "pending_payment", pas encore réservable.\n\nUtilise "Enregistrer un paiement" pour l'activer une fois le paiement reçu.`);
    return;
  }

  const paymentId = promptAndRecordPayment_(packageId, { forceConfirmed: true });
  if (!paymentId) {
    ui.alert(`Forfait créé : ${packageId}, mais la saisie du paiement a été annulée — reste "pending_payment". Utilise "Enregistrer un paiement" pour finaliser.`);
    return;
  }
  ui.alert(`Forfait créé et activé : ${packageId} (paiement ${paymentId}).`);
}

/**
 * Saisie manuelle d'une réservation externe (ClassPass ou WhatsApp), pour la
 * fiche cliente uniquement — ne crée AUCUN événement Calendar et ne touche à
 * aucun compteur de forfait. N'importe/synchronise jamais automatiquement
 * ClassPass : purement déclaratif, saisi à la main par l'administratrice.
 */
function adminAddManualBooking() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Aucune cliente avec cet email. Ajoute-la d\'abord.'); return; }

  const sourceRaw = ui.prompt('Source : "classpass" ou "whatsapp" (ou "other") :').getResponseText().trim().toLowerCase();
  if ([BOOKING_SOURCE.CLASSPASS, BOOKING_SOURCE.WHATSAPP, BOOKING_SOURCE.OTHER].indexOf(sourceRaw) === -1) {
    ui.alert('Source invalide.');
    return;
  }

  const serviceId = ui.prompt('Soin (ex. lymphatic-1z) :').getResponseText().trim();
  const startRaw = ui.prompt('Date/heure du rendez-vous (AAAA-MM-JJ HH:MM) :').getResponseText().trim();
  const start = new Date(startRaw.replace(' ', 'T'));
  if (isNaN(start.getTime())) { ui.alert('Date invalide.'); return; }
  const notes = ui.prompt('Notes (optionnel) :').getResponseText().trim();

  const bookingId = genId_('BKG');
  appendRow_(TABS.BOOKINGS, {
    booking_id: bookingId,
    booking_request_id: '',
    client_id: client.client_id,
    package_id: '',
    service_id: serviceId,
    status: BOOKING_STATUS.EXTERNAL_MANUAL,
    calendar_event_id: '',
    start_datetime: start.toISOString(),
    end_datetime: start.toISOString(),
    session_movement: 'aucun (réservation externe, hors forfait)',
    created_at: new Date(),
    updated_at: new Date(),
    history_notes: notes,
    source: sourceRaw,
    created_by: Session.getActiveUser().getEmail() || 'admin',
  });
  writeAuditLog_('admin', 'add_manual_booking', bookingId, '', sourceRaw, 'Saisie manuelle pour fiche cliente');
  ui.alert(`Réservation manuelle enregistrée : ${bookingId} (source : ${sourceRaw}). Visible dans la fiche cliente.`);
}

/**
 * "Ajouter un rendez-vous forfait" — crée manuellement un rendez-vous pour
 * une cliente disposant déjà d'un forfait actif (ex. après un échange
 * WhatsApp), en utilisant EXACTEMENT le même cœur transactionnel sécurisé
 * que la réservation en self-service (createNewPackageBooking_, Booking.gs) :
 * verrou, idempotence, re-vérification complète, restauration en cas
 * d'échec Calendar. Rien n'est dupliqué.
 *
 * Un événement ajouté directement dans Google Calendar (hors de cette
 * fonction) ne déduit JAMAIS de séance automatiquement — voir aussi
 * "Associer un événement Calendar existant à un forfait" ci-dessous pour
 * le cas où l'événement existe déjà.
 */
function adminAddPackageBooking() {
  const ui = ui_();

  // --- Identifier la cliente : recherche par téléphone d'abord ---
  const phoneRaw = ui.prompt('Numéro de téléphone de la cliente (recherche) :').getResponseText().trim();
  let client = null;
  const matches = phoneRaw ? findClientsByPhone_(phoneRaw) : [];

  if (matches.length === 1) {
    client = matches[0];
  } else if (matches.length > 1) {
    // Ne jamais deviner : afficher la liste, demander une sélection manuelle explicite.
    const list = matches.map((c) => `${c.client_id} — ${c.prenom} ${c.nom} — ${c.email || '(pas d\'email)'} — ${c.telephone}`).join('\n');
    const clientIdChoice = ui.prompt(
      `Plusieurs clientes correspondent à ce numéro :\n${list}\n\nSaisis le client_id exact à utiliser :`
    ).getResponseText().trim();
    client = findRowBy_(TABS.CLIENTS, 'client_id', clientIdChoice);
    if (!client) { ui.alert('client_id introuvable, opération annulée.'); return; }
  } else {
    const emailFallback = ui.prompt('Aucune cliente trouvée avec ce numéro. Email de la cliente (secours, laisser vide pour annuler) :').getResponseText().trim().toLowerCase();
    client = emailFallback ? findClientByEmail_(emailFallback) : null;
    if (!client) {
      ui.alert('Aucune cliente trouvée. Utilise d\'abord "Ajouter une cliente", ou vérifie le numéro/email — jamais de création automatique ici.');
      return;
    }
  }

  // Email facultatif : ne remplace jamais un email déjà connu, complète seulement s'il manquait.
  if (!client.email) {
    const emailFacultatif = ui.prompt('Email de la cliente (facultatif, laisser vide si inconnu) :').getResponseText().trim().toLowerCase();
    if (emailFacultatif) {
      updateRow_(TABS.CLIENTS, client.rowNumber, { email: emailFacultatif });
      writeAuditLog_('admin', 'update_client_email', client.client_id, '', emailFacultatif, 'Complété via "Ajouter un rendez-vous forfait"');
      client = findRowBy_(TABS.CLIENTS, 'client_id', client.client_id);
    }
  }

  // --- Forfait actif ---
  const activePackages = findActivePackagesForClient_(client.client_id);
  if (activePackages.length === 0) {
    ui.alert(`Aucun forfait actif pour ${client.prenom} ${client.nom}. Impossible de créer un rendez-vous forfait.`);
    return;
  }
  const pkgList = activePackages.map((p) => `${p.package_id} — ${p.nom_forfait} — dispo ${p.available_sessions} — soins : ${p.soins_inclus}`).join('\n');
  const packageId = ui.prompt(`Forfaits actifs de ${client.prenom} ${client.nom} :\n${pkgList}\n\nSaisis le package_id à utiliser :`).getResponseText().trim();
  const pkg = findPackageById_(packageId);
  if (!pkg || pkg.client_id !== client.client_id) { ui.alert('Forfait invalide pour cette cliente.'); return; }

  // --- Soin, date, heure, durée ---
  const serviceId = ui.prompt('Soin (ex. lymphatic-1z — doit être inclus dans le forfait choisi) :').getResponseText().trim();
  const dateRaw = ui.prompt('Date du rendez-vous (AAAA-MM-JJ) :').getResponseText().trim();
  const heureRaw = ui.prompt('Heure (HH:MM) :').getResponseText().trim();
  const start = new Date(`${dateRaw}T${heureRaw}`);
  if (isNaN(start.getTime())) { ui.alert('Date/heure invalide.'); return; }
  const dureeRaw = ui.prompt('Durée en minutes (ex. 60) :').getResponseText().trim();
  const duree = parseInt(dureeRaw, 10);
  if (isNaN(duree) || duree <= 0) { ui.alert('Durée invalide.'); return; }
  const end = new Date(start.getTime() + duree * 60 * 1000);

  const noteAdmin = ui.prompt('Note administrative (optionnel) :').getResponseText().trim();

  const origineRaw = ui.prompt('Origine : whatsapp / phone / admin_manual / package_client_request / other :').getResponseText().trim().toLowerCase();
  const validOrigins = [
    BOOKING_SOURCE.WHATSAPP, BOOKING_SOURCE.PHONE, BOOKING_SOURCE.ADMIN_MANUAL,
    BOOKING_SOURCE.PACKAGE_CLIENT_REQUEST, BOOKING_SOURCE.OTHER,
  ];
  if (validOrigins.indexOf(origineRaw) === -1) { ui.alert('Origine invalide.'); return; }

  const confirm = ui.alert(
    `Confirmer la création de ce rendez-vous ?\n\n` +
    `Cliente : ${client.prenom} ${client.nom}\nForfait : ${pkg.package_id} (${pkg.nom_forfait})\n` +
    `Soin : ${serviceId}\nDébut : ${start}\nDurée : ${duree} min\nOrigine : ${origineRaw}`,
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) { ui.alert('Opération annulée — rien n\'a été modifié.'); return; }

  const bookingRequestId = 'admin-' + Utilities.getUuid();
  const actor = Session.getActiveUser().getEmail() || 'admin';

  let result;
  try {
    result = adminCreatePackageBooking_(
      client.client_id, pkg.package_id, serviceId, start.toISOString(), end.toISOString(), bookingRequestId,
      { origin: origineRaw, historyNotes: noteAdmin, actor: actor }
    );
  } catch (err) {
    ui.alert(`Rendez-vous NON créé : ${err && err.message ? err.message : 'erreur inconnue'}\n\nAucune séance n'a été déduite, aucun événement Calendar créé.`);
    return;
  }

  ui.alert(`Rendez-vous forfait créé et confirmé.\ncalendar_event_id : ${result.calendarEventId}`);
}

/**
 * "Associer un événement Calendar existant à un forfait" — pour un
 * rendez-vous déjà présent dans le calendrier (ajouté à la main
 * directement dans Google Calendar), permet de le relier explicitement à
 * un forfait ET de déduire une séance, uniquement sur confirmation
 * explicite de l'administratrice. Ne devine jamais automatiquement qu'un
 * événement Calendar appartient à un forfait — c'est justement la règle
 * que la réconciliation respecte (elle signale, ne décide jamais seule).
 *
 * Recherche par date (et non par ID/lien d'événement, pour rester simple
 * et fiable) : liste les événements du jour qui ne portent pas encore de
 * marqueur booking_id, et propose un choix numéroté.
 */
function adminLinkCalendarEventToPackage() {
  const ui = ui_();
  const dateRaw = ui.prompt('Date du rendez-vous existant à associer (AAAA-MM-JJ) :').getResponseText().trim();
  const dayStart = new Date(`${dateRaw}T00:00:00`);
  if (isNaN(dayStart.getTime())) { ui.alert('Date invalide.'); return; }
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  if (!calendar) { ui.alert('Calendrier configuré introuvable ou inaccessible.'); return; }

  const candidates = calendar.getEvents(dayStart, dayEnd).filter((e) => !extractBookingIdFromDescription_(e.getDescription()));
  if (candidates.length === 0) {
    ui.alert('Aucun événement non associé trouvé ce jour-là dans le calendrier configuré.');
    return;
  }
  const list = candidates.map((e, i) => `${i + 1}. ${e.getTitle()} — ${e.getStartTime()}`).join('\n');
  const choiceRaw = ui.prompt(`Événements non associés ce jour-là :\n${list}\n\nNuméro à associer :`).getResponseText().trim();
  const choice = parseInt(choiceRaw, 10);
  if (isNaN(choice) || choice < 1 || choice > candidates.length) { ui.alert('Choix invalide.'); return; }
  const event = candidates[choice - 1];

  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Cliente introuvable.'); return; }

  const activePackages = findActivePackagesForClient_(client.client_id);
  if (activePackages.length === 0) { ui.alert('Aucun forfait actif pour cette cliente.'); return; }
  const pkgList = activePackages.map((p) => `${p.package_id} — ${p.nom_forfait} — dispo ${p.available_sessions} — soins : ${p.soins_inclus}`).join('\n');
  const packageId = ui.prompt(`Forfaits actifs :\n${pkgList}\n\npackage_id à utiliser :`).getResponseText().trim();
  const pkg = findPackageById_(packageId);
  if (!pkg || pkg.client_id !== client.client_id) { ui.alert('Forfait invalide pour cette cliente.'); return; }

  const serviceId = ui.prompt('Soin concerné (doit être inclus dans le forfait) :').getResponseText().trim();
  const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
  if (included.indexOf(serviceId) === -1) { ui.alert('Ce soin n\'est pas inclus dans ce forfait, opération annulée.'); return; }
  if (Number(pkg.available_sessions) < 1) { ui.alert('Aucune séance disponible sur ce forfait, opération annulée.'); return; }

  const confirm = ui.alert(
    `Associer l'événement "${event.getTitle()}" (${event.getStartTime()}) au forfait ${pkg.package_id} de ` +
    `${client.prenom} ${client.nom}, et déduire une séance (available -1 / reserved +1) ?\n\n` +
    'Cette déduction ne peut pas être automatique — confirme explicitement.',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) { ui.alert('Opération annulée — rien n\'a été modifié.'); return; }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert('Le système est occupé, réessaie dans un instant.'); return; }
  try {
    const bookingId = genId_('BKG');
    const existingDescription = event.getDescription() || '';
    event.setDescription(
      (existingDescription ? existingDescription + '\n' : '') +
      `booking_id: ${bookingId}\nclient_id: ${client.client_id}\nservice: ${serviceId}\n` +
      'Événement Calendar existant associé manuellement à un forfait.'
    );

    appendRow_(TABS.BOOKINGS, {
      booking_id: bookingId,
      booking_request_id: 'manual-link-' + Utilities.getUuid(),
      client_id: client.client_id,
      package_id: packageId,
      service_id: serviceId,
      status: BOOKING_STATUS.CONFIRMED,
      calendar_event_id: event.getId(),
      start_datetime: event.getStartTime().toISOString(),
      end_datetime: event.getEndTime().toISOString(),
      session_movement: 'available -1 / reserved +1 (événement existant associé manuellement)',
      created_at: new Date(),
      updated_at: new Date(),
      history_notes: 'Association manuelle d\'un événement Calendar déjà existant.',
      source: BOOKING_SOURCE.ADMIN_MANUAL,
      created_by: Session.getActiveUser().getEmail() || 'admin',
    });

    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      available_sessions: Number(pkg.available_sessions) - 1,
      reserved_sessions: Number(pkg.reserved_sessions) + 1,
    });

    writeAuditLog_(
      Session.getActiveUser().getEmail() || 'admin',
      'link_existing_calendar_event',
      bookingId, '', packageId,
      `Événement ${event.getId()} associé manuellement, soin ${serviceId}`
    );
  } finally {
    lock.releaseLock();
  }
  ui.alert('Événement associé au forfait, séance déduite.');
}

function adminAdjustBalance() {
  const ui = ui_();
  const packageId = ui.prompt('package_id à ajuster :').getResponseText().trim();
  const pkg = findPackageById_(packageId);
  if (!pkg) { ui.alert('Forfait introuvable.'); return; }

  const field = ui.prompt('Quel compteur ajuster ? (available_sessions / reserved_sessions / used_sessions)').getResponseText().trim();
  if (['available_sessions', 'reserved_sessions', 'used_sessions'].indexOf(field) === -1) {
    ui.alert('Compteur invalide.'); return;
  }
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

function adminMarkSessionUsed() {
  adjustAfterAppointment_('used');
}

function adminRestoreSession() {
  adjustAfterAppointment_('restore');
}

/** Utilisé par "marquer utilisée" / "restaurer" : déplace reserved -> used ou reserved -> available. */
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
      reserved_sessions: Number(pkg.reserved_sessions) - 1,
      used_sessions: Number(pkg.used_sessions) + 1,
    });
    updateRow_(TABS.BOOKINGS, booking.rowNumber, { status: BOOKING_STATUS.NO_SHOW_OR_LATE_CANCEL, updated_at: new Date() });
  } else {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1,
      available_sessions: Number(pkg.available_sessions) + 1,
    });
    updateRow_(TABS.BOOKINGS, booking.rowNumber, { status: BOOKING_STATUS.CANCELLED_AUTHORIZED, updated_at: new Date() });
  }
  writeAuditLog_('admin', 'mark_session_' + outcome, bookingId, 'reserved', outcome, motif);
  ui.alert('Fait.');
}

function adminCancelBookingByClient() {
  cancelBooking_(false);
}

function adminCancelBookingByInstitute() {
  cancelBooking_(true);
}

/**
 * Annulation avec application automatique des règles :
 * - à l'initiative de l'institut → toujours restaurée ;
 * - sinon : délai ≥ cancellation_deadline_hours → restaurée,
 *           délai < cancellation_deadline_hours → utilisée, sauf dérogation motivée.
 */
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

  // Supprimer l'événement Calendar.
  const settings2 = getSettings();
  const calendar = CalendarApp.getCalendarById(settings2.calendar_id);
  if (booking.calendar_event_id) {
    try {
      const event = calendar.getEventById(booking.calendar_event_id);
      if (event) event.deleteEvent();
    } catch (e) {
      // L'événement a peut-être déjà été supprimé manuellement — on continue quand même.
    }
  }

  const pkg = findPackageById_(booking.package_id);
  if (outcome === 'restore') {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1,
      available_sessions: Number(pkg.available_sessions) + 1,
    });
  } else {
    updateRow_(TABS.PACKAGES, pkg.rowNumber, {
      reserved_sessions: Number(pkg.reserved_sessions) - 1,
      used_sessions: Number(pkg.used_sessions) + 1,
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

/**
 * Report : transfère la séance déjà réservée vers un nouveau créneau, sans
 * consommer de deuxième séance. Même booking_id conservé.
 */
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

  if (!isSlotStillFree(newStart.toISOString(), newEnd.toISOString())) {
    ui.alert('Ce créneau n\'est pas libre.');
    return;
  }

  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  if (booking.calendar_event_id) {
    try {
      const oldEvent = calendar.getEventById(booking.calendar_event_id);
      if (oldEvent) oldEvent.deleteEvent();
    } catch (e) { /* déjà supprimé, on continue */ }
  }

  const newEvent = createCalendarEventForBooking_(
    booking.booking_id, booking.client_id, booking.service_id,
    newStart.toISOString(), newEnd.toISOString()
  );

  updateRow_(TABS.BOOKINGS, booking.rowNumber, {
    calendar_event_id: newEvent.getId(),
    start_datetime: newStart.toISOString(),
    end_datetime: newEnd.toISOString(),
    status: BOOKING_STATUS.CONFIRMED,
    updated_at: new Date(),
    history_notes: `Reporté depuis ${booking.start_datetime}`,
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

/**
 * ============================================================================
 *  RECONCILIATION.gs — Contrôle quotidien : signale, ne corrige jamais
 *  silencieusement en cas de doute.
 * ============================================================================
 *
 *  Un seul cas est corrigé automatiquement (justifié dans le cadrage) :
 *  un Booking "pending" depuis plus de reconciliation_stale_pending_minutes
 *  SANS calendar_event_id — dans ce cas précis, on sait avec certitude
 *  qu'aucun événement n'a jamais été créé, donc la restauration est sûre.
 *
 *  À brancher sur un déclencheur horaire/quotidien (voir README) :
 *  Apps Script → Déclencheurs → Ajouter un déclencheur →
 *  runReconciliationCheck → Basé sur le temps → Minuteries jour → 1x/jour.
 */

function runReconciliationCheck() {
  const settings = getSettings();
  const calendar = CalendarApp.getCalendarById(settings.calendar_id);
  const bookings = readAllRows_(TABS.BOOKINGS);
  const packages = readAllRows_(TABS.PACKAGES);
  const issues = [];

  // --- 1. Booking confirmed sans calendar_event_id ---
  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && !b.calendar_event_id)
    .forEach((b) => issues.push(['confirmed_without_event', b.booking_id, 'Booking confirmed sans calendar_event_id']));

  // --- 2 & 6. Événements Calendar avec marqueur booking_id, orphelins ou dupliqués ---
  const lookaheadStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lookaheadEnd = new Date(Date.now() + settings.lookahead_days * 24 * 60 * 60 * 1000);
  const events = calendar.getEvents(lookaheadStart, lookaheadEnd);
  const eventsByBookingId = {};
  events.forEach((e) => {
    const bId = extractBookingIdFromDescription_(e.getDescription());
    if (bId) {
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
      // Correspondance unique et non ambiguë : on complète l'enregistrement.
      updateRow_(TABS.BOOKINGS, booking.rowNumber, {
        calendar_event_id: matchingEvents[0].getId(),
        status: BOOKING_STATUS.CONFIRMED,
        updated_at: new Date(),
      });
      writeAuditLog_('system', 'reconciliation_auto_complete', bId, 'pending', 'confirmed', 'Événement retrouvé, complétion automatique sûre');
    }
  });

  // --- 3. Rendez-vous passé toujours confirmed ---
  const now = new Date();
  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && new Date(b.end_datetime) < now)
    .forEach((b) => issues.push(['past_still_confirmed', b.booking_id, 'RDV passé, statut toujours confirmed — à traiter (utilisée / no-show)']));

  // --- 5. booking_request_id en double ---
  const requestIdCounts = {};
  bookings.forEach((b) => {
    requestIdCounts[b.booking_request_id] = (requestIdCounts[b.booking_request_id] || 0) + 1;
  });
  Object.keys(requestIdCounts).forEach((rid) => {
    if (requestIdCounts[rid] > 1) {
      issues.push(['duplicate_booking_request_id', rid, `${requestIdCounts[rid]} lignes Bookings partagent ce booking_request_id`]);
    }
  });

  // --- 7. Événement déplacé/supprimé directement dans Calendar ---
  bookings
    .filter((b) => b.status === BOOKING_STATUS.CONFIRMED && b.calendar_event_id)
    .forEach((b) => {
      try {
        const event = calendar.getEventById(b.calendar_event_id);
        if (!event) {
          issues.push(['event_deleted_externally', b.booking_id, 'Événement introuvable dans Calendar (supprimé hors système ?)']);
        }
      } catch (e) {
        issues.push(['event_lookup_error', b.booking_id, String(e)]);
      }
    });

  // --- 4 & 8. Cohérence des compteurs de séances ---
  packages.forEach((pkg) => {
    const total = Number(pkg.total_sessions);
    const sum = Number(pkg.available_sessions) + Number(pkg.reserved_sessions) + Number(pkg.used_sessions);
    if (total !== sum) {
      issues.push(['session_count_mismatch', pkg.package_id, `total_sessions=${total} mais available+reserved+used=${sum}`]);
    }

    const reservedBookingsCount = bookings.filter(
      (b) => b.package_id === pkg.package_id && b.status === BOOKING_STATUS.CONFIRMED && new Date(b.end_datetime) >= now
    ).length;
    if (reservedBookingsCount !== Number(pkg.reserved_sessions)) {
      issues.push(['reserved_count_mismatch', pkg.package_id, `reserved_sessions=${pkg.reserved_sessions} mais ${reservedBookingsCount} Bookings confirmed à venir`]);
    }
  });

  // --- Correction automatique sûre : pending ancien sans calendar_event_id ---
  const staleThreshold = new Date(Date.now() - settings.reconciliation_stale_pending_minutes * 60 * 1000);
  bookings
    .filter((b) => b.status === BOOKING_STATUS.PENDING && !b.calendar_event_id && new Date(b.created_at) < staleThreshold)
    .forEach((b) => {
      const pkg = findPackageById_(b.package_id);
      if (pkg) {
        updateRow_(TABS.PACKAGES, pkg.rowNumber, {
          available_sessions: Number(pkg.available_sessions) + 1,
          reserved_sessions: Number(pkg.reserved_sessions) - 1,
        });
      }
      updateRow_(TABS.BOOKINGS, b.rowNumber, { status: BOOKING_STATUS.FAILED, updated_at: new Date() });
      writeAuditLog_('system', 'reconciliation_auto_restore_stale_pending', b.booking_id, 'pending', 'failed', 'pending ancien sans événement Calendar — restauration sûre');
    });

  // --- Correction automatique sûre (Phase 2, Étape B) : offres expirées ---
  // Fait objectif et sans ambiguïté (comparaison de dates) — ne touche à
  // aucun forfait ni paiement, donc sans risque, contrairement à toute autre
  // anomalie qui reste seulement signalée.
  const nowForOffers = new Date();
  readAllRows_(TABS.PACKAGE_OFFERS)
    .filter((o) => o.date_expiration_lien && new Date(o.date_expiration_lien) < nowForOffers &&
      [OFFER_STATUS.EXPIRED, OFFER_STATUS.DECLINED, OFFER_STATUS.CANCELLED, OFFER_STATUS.PAID].indexOf(o.statut) === -1)
    .forEach((o) => {
      updateRow_(TABS.PACKAGE_OFFERS, o.rowNumber, { statut: OFFER_STATUS.EXPIRED });
      writeAuditLog_('system', 'offer_expired_reconciliation', o.offer_id, o.statut, OFFER_STATUS.EXPIRED, 'Expiration automatique (réconciliation quotidienne)');
    });

  // --- Écriture des anomalies détectées ---
  issues.forEach(([type, entity, details]) => {
    appendRow_(TABS.RECONCILIATION_ISSUES, {
      timestamp_detection: new Date(),
      type_anomalie: type,
      entite_concernee: entity,
      details: details,
      statut: 'a_verifier',
      resolution_notes: '',
    });
  });

  Logger.log(`Réconciliation terminée : ${issues.length} anomalie(s) signalée(s).`);
  return issues.length;
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 11 — WebApp.gs (point d'entrée HTTP)
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  WEBAPP.gs — Point d'entrée HTTP de la Web App (appelé par le site).
 * ============================================================================
 *
 *  ⚠️ Le frontend doit envoyer ses requêtes POST avec
 *  Content-Type: text/plain;charset=utf-8 (et non application/json) — sans
 *  quoi le navigateur déclenche une requête "preflight" OPTIONS que les Web
 *  Apps Apps Script ne savent pas traiter (erreur 405). Le corps envoyé
 *  reste du JSON valide, seul l'en-tête Content-Type change ; ce fichier lit
 *  e.postData.contents et fait le JSON.parse lui-même.
 *
 *  Chaque réponse est un JSON { success: boolean, data? , error? }. Aucune
 *  trace technique (stack, message d'exception brut) n'est jamais renvoyée :
 *  seules les erreurs métier (BookingBusinessError_ / RateLimitError_) sont
 *  transmises telles quelles, tout le reste devient un message générique.
 */

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

      case 'get-client-dashboard':
        data = handleGetClientDashboard_(body.sessionToken);
        break;

      case 'confirm-booking':
        data = confirmPackageBooking(
          body.sessionToken, body.bookingRequestId, body.serviceId, body.startIso, body.endIso
        );
        break;

      case 'get-offer':
        data = getOfferDetails(body.offerId, body.token);
        break;

      case 'respond-offer':
        data = respondToOffer(body.offerId, body.token, body.response);
        break;

      default:
        return jsonResponse_({ success: false, error: 'Action inconnue.' });
    }
    return jsonResponse_({ success: true, data: data });
  } catch (err) {
    if (err instanceof BookingBusinessError_ || err instanceof RateLimitError_) {
      return jsonResponse_({ success: false, error: err.message });
    }
    // Erreur inattendue : on logge le détail côté serveur, on ne renvoie
    // qu'un message générique côté client (aucune info technique exposée).
    Logger.log('Erreur inattendue dans doPost (action=' + action + ') : ' + err + '\n' + err.stack);
    return jsonResponse_({ success: false, error: 'Une erreur est survenue, merci de réessayer.' });
  }
}

function doGet(e) {
  return jsonResponse_({ success: false, error: 'Cette Web App ne répond qu\'aux requêtes POST.' });
}

/** Valide le jeton de session et renvoie les créneaux disponibles pour le soin demandé. */
function handleGetSlots_(sessionTokenPlain, serviceId, durationMinutes) {
  if (!sessionTokenPlain) {
    throw new BookingBusinessError_('Session invalide.');
  }
  const tokenHash = hashWithPepper_(sessionTokenPlain);
  const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    throw new BookingBusinessError_('Session invalide ou expirée, merci de recommencer la vérification.');
  }

  const pkg = findPackageById_(tokenRow.package_id);
  const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
  if (included.indexOf(serviceId) === -1) {
    throw new BookingBusinessError_('Ce soin n\'est pas inclus dans ce forfait.');
  }

  const duration = Number(durationMinutes) || DEFAULT_APPOINTMENT_MINUTES;
  return { slots: computeAvailableSlots(duration) };
}

/**
 * Valide le jeton de session et renvoie le solde du forfait + les
 * prochains rendez-vous confirmés de la cliente — affiché avant la
 * sélection de créneau sur /use-package (UX : la cliente voit où elle en
 * est avant de réserver, sans avoir à appeler).
 */
function handleGetClientDashboard_(sessionTokenPlain) {
  if (!sessionTokenPlain) {
    throw new BookingBusinessError_('Session invalide.');
  }
  const tokenHash = hashWithPepper_(sessionTokenPlain);
  const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    throw new BookingBusinessError_('Session invalide ou expirée, merci de recommencer la vérification.');
  }

  const pkg = findPackageById_(tokenRow.package_id);
  const now = new Date();
  const upcomingBookings = readAllRows_(TABS.BOOKINGS)
    .filter((b) => b.client_id === tokenRow.client_id && b.status === BOOKING_STATUS.CONFIRMED && new Date(b.start_datetime) > now)
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .map((b) => ({ serviceId: b.service_id, start: b.start_datetime, end: b.end_datetime }));

  return {
    packageName: pkg ? pkg.nom_forfait : '',
    availableSessions: pkg ? Number(pkg.available_sessions) : 0,
    upcomingBookings: upcomingBookings,
  };
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 12 — PackageTemplates.gs (Phase 2, Étape A — catalogue de forfaits)
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  PACKAGETEMPLATES.gs — Catalogue de forfaits (Phase 2, Étape A).
 * ============================================================================
 *
 *  Un modèle ("template") définit les conditions par défaut d'un forfait :
 *  nom, soins inclus, nombre de séances, prix, durée de validité. Quand un
 *  forfait est attribué à une cliente (adminAddPackage, AdminMenu.gs), les
 *  valeurs du modèle sont COPIÉES dans la ligne Packages au moment de
 *  l'attribution — une modification ultérieure du modèle ne change jamais
 *  rétroactivement les forfaits déjà attribués.
 *
 *  Catégories limitées à 3 au lancement : decouverte / principal / premium.
 *  Un modèle 'premium' peut être marqué visibilite='private' : il n'est
 *  jamais publié sur le site et reste proposable uniquement par
 *  l'administratrice via "Proposer un forfait" (Étape B).
 *
 *  ⚠️ Aucun de ces modèles n'est jamais publié sur le site tant que
 *  l'administratrice ne l'a pas explicitement demandé — ce fichier ne
 *  touche à aucune route publique ni à WebApp.gs.
 */

function findPackageTemplateById_(templateId) {
  return findRowBy_(TABS.PACKAGE_TEMPLATES, 'package_template_id', templateId);
}

/** Modèles actifs, triés par ordre_affichage croissant. Utilisé par "Proposer un forfait" (Étape B). */
function listActivePackageTemplates_() {
  return readAllRows_(TABS.PACKAGE_TEMPLATES)
    .filter((t) => t.statut === PACKAGE_TEMPLATE_STATUS.ACTIVE)
    .sort((a, b) => Number(a.ordre_affichage || 0) - Number(b.ordre_affichage || 0));
}

function adminAddPackageTemplate() {
  const ui = ui_();
  const nom = ui.prompt('Nom du forfait (ex. "Découverte Drainage 3 séances") :').getResponseText().trim();
  if (!nom) { ui.alert('Nom obligatoire, opération annulée.'); return; }

  const description = ui.prompt('Description (visible cliente si publié un jour) :').getResponseText().trim();
  const soinsInclus = ui.prompt('Soins inclus, séparés par des virgules (ex. lymphatic-1z, maderotherapy) :').getResponseText().trim();
  const nombreSeancesRaw = ui.prompt('Nombre de séances :').getResponseText().trim();
  const nombreSeances = parseInt(nombreSeancesRaw, 10);
  if (isNaN(nombreSeances) || nombreSeances <= 0) { ui.alert('Nombre de séances invalide.'); return; }

  const prixPublicRaw = ui.prompt('Prix public (nombre, ex. 350) :').getResponseText().trim();
  const prixPublic = parseFloat(prixPublicRaw);
  if (isNaN(prixPublic) || prixPublic < 0) { ui.alert('Prix invalide.'); return; }

  const dureeValiditeRaw = ui.prompt('Durée de validité en jours (ex. 180), laisser vide si aucune :').getResponseText().trim();
  const dureeValidite = dureeValiditeRaw ? parseInt(dureeValiditeRaw, 10) : '';

  const categorieRaw = ui.prompt('Catégorie : "decouverte" / "principal" / "premium" :').getResponseText().trim().toLowerCase();
  if (Object.values(PACKAGE_TEMPLATE_CATEGORY).indexOf(categorieRaw) === -1) {
    ui.alert('Catégorie invalide (decouverte / principal / premium).');
    return;
  }

  let visibilite = PACKAGE_TEMPLATE_VISIBILITY.PRIVATE;
  if (categorieRaw === PACKAGE_TEMPLATE_CATEGORY.PREMIUM) {
    ui.alert('Catégorie "premium" : ce modèle reste privé (jamais publié, proposé uniquement par toi).');
  } else {
    const visibiliteAnswer = ui.alert(
      'Ce modèle pourra-t-il un jour être publié publiquement sur le site (une fois validé) ?\n\n' +
      'Choisir NON si tu n\'es pas certaine — cela reste modifiable plus tard.',
      ui.ButtonSet.YES_NO
    );
    visibilite = visibiliteAnswer === ui.Button.YES
      ? PACKAGE_TEMPLATE_VISIBILITY.PUBLIC
      : PACKAGE_TEMPLATE_VISIBILITY.PRIVATE;
  }

  const ordreAffichageRaw = ui.prompt('Ordre d\'affichage (nombre, ex. 1, 2, 3...) :').getResponseText().trim();
  const ordreAffichage = parseInt(ordreAffichageRaw, 10) || 0;
  const notesInternes = ui.prompt('Notes internes (optionnel) :').getResponseText().trim();

  const templateId = genId_('TPL');
  appendRow_(TABS.PACKAGE_TEMPLATES, {
    package_template_id: templateId,
    nom, description,
    soins_inclus: soinsInclus,
    nombre_seances: nombreSeances,
    prix_public: prixPublic,
    duree_validite_jours: dureeValidite,
    categorie: categorieRaw,
    visibilite,
    statut: PACKAGE_TEMPLATE_STATUS.ACTIVE,
    ordre_affichage: ordreAffichage,
    notes_internes: notesInternes,
  });
  writeAuditLog_('admin', 'add_package_template', templateId, '', nom, '');
  ui.alert(`Modèle de forfait créé : ${templateId} (${visibilite === PACKAGE_TEMPLATE_VISIBILITY.PRIVATE ? 'privé' : 'publiable'}).`);
}

/** Rappel : jamais rétroactif — ne modifie que le modèle, pas les forfaits déjà attribués (voir en-tête du fichier). */
function adminEditPackageTemplate() {
  const ui = ui_();
  const templateId = ui.prompt('package_template_id à modifier :').getResponseText().trim();
  const tpl = findPackageTemplateById_(templateId);
  if (!tpl) { ui.alert('Modèle introuvable.'); return; }

  ui.alert(
    `Modèle actuel :\nNom : ${tpl.nom}\nSoins : ${tpl.soins_inclus}\nSéances : ${tpl.nombre_seances}\n` +
    `Prix : ${tpl.prix_public}\nValidité (jours) : ${tpl.duree_validite_jours}\nCatégorie : ${tpl.categorie}\n` +
    `Visibilité : ${tpl.visibilite}\nStatut : ${tpl.statut}\nOrdre : ${tpl.ordre_affichage}`
  );

  const field = ui.prompt(
    'Quel champ modifier ? (nom / description / soins_inclus / nombre_seances / prix_public / ' +
    'duree_validite_jours / ordre_affichage / notes_internes)'
  ).getResponseText().trim();
  const editableFields = [
    'nom', 'description', 'soins_inclus', 'nombre_seances', 'prix_public',
    'duree_validite_jours', 'ordre_affichage', 'notes_internes',
  ];
  if (editableFields.indexOf(field) === -1) { ui.alert('Champ invalide ou non modifiable ici.'); return; }

  const newValueRaw = ui.prompt(`Nouvelle valeur pour ${field} (actuelle : ${tpl[field]}) :`).getResponseText().trim();
  let newValue = newValueRaw;
  if (['nombre_seances', 'duree_validite_jours', 'ordre_affichage'].indexOf(field) !== -1) {
    newValue = parseInt(newValueRaw, 10);
  } else if (field === 'prix_public') {
    newValue = parseFloat(newValueRaw);
  }

  const motif = ui.prompt('Motif de la modification (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire, opération annulée.'); return; }

  const updates = {};
  updates[field] = newValue;
  updateRow_(TABS.PACKAGE_TEMPLATES, tpl.rowNumber, updates);
  writeAuditLog_('admin', 'edit_package_template', templateId, `${field}=${tpl[field]}`, `${field}=${newValue}`, motif);
  ui.alert('Modèle mis à jour. Les forfaits déjà attribués ne sont pas affectés (copie figée à l\'achat).');
}

function adminSetPackageTemplateStatus() {
  const ui = ui_();
  const templateId = ui.prompt('package_template_id à activer/désactiver :').getResponseText().trim();
  const tpl = findPackageTemplateById_(templateId);
  if (!tpl) { ui.alert('Modèle introuvable.'); return; }

  const newStatus = tpl.statut === PACKAGE_TEMPLATE_STATUS.ACTIVE
    ? PACKAGE_TEMPLATE_STATUS.INACTIVE
    : PACKAGE_TEMPLATE_STATUS.ACTIVE;
  updateRow_(TABS.PACKAGE_TEMPLATES, tpl.rowNumber, { statut: newStatus });
  writeAuditLog_('admin', 'set_package_template_status', templateId, tpl.statut, newStatus, '');
  ui.alert(`Modèle "${tpl.nom}" maintenant : ${newStatus}.`);
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 13 — Payments.gs (Phase 2, Étape A — paiements, calcul brut/frais/net)
// ════════════════════════════════════════════════════════════════════════

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

  if (isComplimentary) {
    ui.alert('Forfait offert (complimentary) : montant brut et frais fixés à 0 automatiquement.');
  } else {
    devise = ui.prompt('Devise (ex. GBP) :').getResponseText().trim().toUpperCase() || 'GBP';

    const montantBrutRaw = ui.prompt('Montant facturé brut (ex. 900) :').getResponseText().trim();
    montantBrut = parseFloat(montantBrutRaw);
    if (isNaN(montantBrut) || montantBrut < 0) { ui.alert('Montant invalide.'); return null; }

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

// ════════════════════════════════════════════════════════════════════════
//  SECTION 14 — ClientProfile.gs (Phase 2, Étape A — fiche cliente consolidée)
// ════════════════════════════════════════════════════════════════════════

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
  line('Notes admin (épinglée)', client.notes_admin);
  line('Tags', parseTags_(client.tags).join(', ') || '(aucun)');

  const packages = readAllRows_(TABS.PACKAGES).filter((p) => p.client_id === client.client_id);
  const bookings = readAllRows_(TABS.BOOKINGS).filter((b) => b.client_id === client.client_id);
  const payments = findPaymentsByClientId_(client.client_id);
  const offers = readAllRows_(TABS.PACKAGE_OFFERS).filter((o) => o.client_id === client.client_id);
  const notes = findClientNotes_(client.client_id);
  const now = new Date();

  section('Historique des notes');
  notes.forEach((n) => {
    line(formatDateForReport_(n.timestamp), `${n.note} (par ${n.auteur})`);
  });
  if (notes.length === 0) line('(aucune note dans l\'historique)', '');

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
  offers.forEach((o) => {
    line(o.offer_id, `${o.nom_forfait} — ${o.prix_final} — statut ${o.statut} — proposée le ${formatDateForReport_(o.date_proposition)}` +
      (o.package_id_resultant ? ` — convertie en ${o.package_id_resultant}` : ''));
  });
  if (offers.length === 0) line('(aucune)', '');

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

// ════════════════════════════════════════════════════════════════════════
//  SECTION 15 — PackageOffers.gs (Phase 2, Étape B — "Proposer un forfait")
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  PACKAGEOFFERS.gs — "Proposer un forfait" (Phase 2, Étape B).
 * ============================================================================
 *
 *  Une offre est un LIEN à durée de vie limitée que l'administratrice
 *  envoie elle-même (WhatsApp/email) à une cliente. Le lien porte un jeton
 *  opaque, haché en HMAC (hashWithPepper_, réutilisé de Security.gs) avant
 *  stockage — comme pour les jetons de session, le jeton en clair n'est
 *  JAMAIS conservé nulle part après sa génération.
 *
 *  ⚠️ Règle absolue : consulter ou accepter une offre ne crée AUCUN forfait
 *  et ne débite RIEN. Seule adminConvertOfferToPackage (déclenchée par
 *  l'administratrice, jamais automatiquement) crée un forfait réel — et ce
 *  forfait reste "pending_payment" tant que Payments.gs n'a pas confirmé un
 *  paiement, exactement comme pour adminAddPackage (AdminMenu.gs).
 *
 *  Ce fichier regroupe à la fois les fonctions "admin" (créer/annuler une
 *  offre, convertir) et les fonctions "publiques" (consultation/réponse par
 *  la cliente, appelées depuis WebApp.gs) — même organisation que
 *  PackageTemplates.gs et Payments.gs.
 */

// ─────────────────────────────────────────────────────────────────────────
//  Lecture / helpers partagés
// ─────────────────────────────────────────────────────────────────────────

function findOfferById_(offerId) {
  return findRowBy_(TABS.PACKAGE_OFFERS, 'offer_id', offerId);
}

/** Construit l'URL publique de consultation d'une offre. */
function buildOfferUrl_(offerId, tokenPlain) {
  const settings = getSettings();
  const base = String(settings.site_base_url || 'https://www.elysian-institute.com').replace(/\/$/, '');
  return `${base}/offer/${offerId}?token=${encodeURIComponent(tokenPlain)}`;
}

/**
 * Recherche une cliente par email ; si absente, propose de la créer tout de
 * suite (une offre s'adresse souvent à une toute nouvelle cliente, contrairement
 * à "Ajouter un rendez-vous forfait" qui suppose une cliente déjà existante).
 * Renvoie null si l'admin annule.
 */
function findOrPromptCreateClient_(email) {
  const ui = ui_();
  const existing = findClientByEmail_(email);
  if (existing) return existing;

  const create = ui.alert(`Aucune cliente trouvée avec "${email}". Créer une nouvelle cliente ?`, ui.ButtonSet.YES_NO);
  if (create !== ui.Button.YES) return null;

  const prenom = ui.prompt('Prénom de la cliente :').getResponseText().trim();
  const nom = ui.prompt('Nom de la cliente :').getResponseText().trim();
  const telephone = ui.prompt('Téléphone (optionnel) :').getResponseText().trim();

  const clientId = genId_('CLI');
  appendRow_(TABS.CLIENTS, {
    client_id: clientId, prenom, nom, email, telephone,
    notes_admin: '', date_creation: new Date(),
  });
  writeAuditLog_('admin', 'add_client', clientId, '', email, 'Créée via "Proposer un forfait"');
  return findRowBy_(TABS.CLIENTS, 'client_id', clientId);
}

/** Petite modale HTML avec un champ en lecture seule + bouton copier — le lien n'est affiché qu'une fois. */
function showCopyableLinkDialog_(title, message, url) {
  const escapedUrl = url.replace(/"/g, '&quot;');
  const escapedMessage = String(message).replace(/</g, '&lt;');
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family: Arial, sans-serif; padding: 8px;">' +
    `<p>${escapedMessage}</p>` +
    `<input id="offerUrlInput" type="text" value="${escapedUrl}" readonly ` +
    'style="width: 100%; padding: 8px; font-size: 13px; box-sizing: border-box;" onclick="this.select();" />' +
    '<button id="copyBtn" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">Copier le lien</button>' +
    '<p id="copyStatus" style="color: green; font-size: 12px;"></p>' +
    '<script>' +
    'document.getElementById("copyBtn").addEventListener("click", function () {' +
    '  var input = document.getElementById("offerUrlInput");' +
    '  input.select(); input.setSelectionRange(0, 99999);' +
    '  function done() { document.getElementById("copyStatus").innerText = "Copié !"; }' +
    '  try {' +
    '    navigator.clipboard.writeText(input.value).then(done).catch(function () { document.execCommand("copy"); done(); });' +
    '  } catch (e) { document.execCommand("copy"); done(); }' +
    '});' +
    '</script>' +
    '</div>'
  ).setWidth(440).setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}

// ─────────────────────────────────────────────────────────────────────────
//  Fonctions admin
// ─────────────────────────────────────────────────────────────────────────

/**
 * "Proposer un forfait" : recherche/crée la cliente, sélectionne un modèle
 * du catalogue (ou saisie manuelle), permet d'ajuster séances/prix/validité,
 * génère un lien à durée de vie limitée. N'active jamais rien par elle-même.
 */
function adminCreatePackageOffer() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente (existante ou nouvelle) :').getResponseText().trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) { ui.alert('Email invalide, opération annulée.'); return; }
  const client = findOrPromptCreateClient_(email);
  if (!client) { ui.alert('Opération annulée.'); return; }

  const templateId = ui.prompt('package_template_id à proposer (laisser vide pour saisie manuelle) :').getResponseText().trim();
  let nom, soinsInclus, nombreSeances, prixFinal, dureeValiditeJours;

  if (templateId) {
    const tpl = findPackageTemplateById_(templateId);
    if (!tpl) { ui.alert('Modèle introuvable.'); return; }
    nom = tpl.nom;
    soinsInclus = tpl.soins_inclus;
    nombreSeances = Number(tpl.nombre_seances);
    prixFinal = Number(tpl.prix_public);
    dureeValiditeJours = tpl.duree_validite_jours || '';
  } else {
    nom = ui.prompt('Nom du forfait proposé :').getResponseText().trim();
    soinsInclus = ui.prompt('Soins inclus, séparés par des virgules :').getResponseText().trim();
    nombreSeances = parseInt(ui.prompt('Nombre de séances :').getResponseText().trim(), 10);
    prixFinal = parseFloat(ui.prompt('Prix proposé :').getResponseText().trim());
    dureeValiditeJours = ui.prompt('Durée de validité du forfait en jours (laisser vide si aucune) :').getResponseText().trim();
  }

  // Ajustement possible même si sourcé d'un modèle.
  const adjustSeances = ui.prompt(`Nombre de séances (actuel : ${nombreSeances}) — laisser vide pour garder :`).getResponseText().trim();
  if (adjustSeances) nombreSeances = parseInt(adjustSeances, 10);
  const adjustPrix = ui.prompt(`Prix proposé (actuel : ${prixFinal}) — laisser vide pour garder :`).getResponseText().trim();
  if (adjustPrix) prixFinal = parseFloat(adjustPrix);
  const adjustValidite = ui.prompt(`Durée de validité du forfait en jours (actuelle : ${dureeValiditeJours || 'aucune'}) — laisser vide pour garder :`).getResponseText().trim();
  if (adjustValidite) dureeValiditeJours = adjustValidite;

  if (isNaN(nombreSeances) || nombreSeances <= 0 || isNaN(prixFinal) || prixFinal < 0) {
    ui.alert('Valeurs invalides, opération annulée.');
    return;
  }

  const moyenPaiementRaw = ui.prompt(
    'Moyen de paiement proposé (informatif) : revolut_card_payment / revolut_pay / bank_transfer / ' +
    'stripe / classpass / card_in_person / cash / complimentary / other :'
  ).getResponseText().trim().toLowerCase();
  if (Object.values(PAYMENT_METHOD).indexOf(moyenPaiementRaw) === -1) { ui.alert('Moyen de paiement invalide.'); return; }

  const settings = getSettings();
  const validityDaysRaw = ui.prompt(`Durée de validité DU LIEN en jours (laisser vide pour ${settings.offer_default_validity_days}) :`).getResponseText().trim();
  const linkValidityDays = validityDaysRaw ? parseInt(validityDaysRaw, 10) : Number(settings.offer_default_validity_days);
  const expirationDate = new Date(Date.now() + linkValidityDays * 24 * 60 * 60 * 1000);

  const offerId = genId_('OFFER');
  const rawToken = generateSessionToken_(); // même primitive que les jetons de session
  const tokenHash = hashWithPepper_(rawToken);

  appendRow_(TABS.PACKAGE_OFFERS, {
    offer_id: offerId,
    client_id: client.client_id,
    package_template_id: templateId || '',
    nom_forfait: nom,
    soins_inclus: soinsInclus,
    nombre_seances: nombreSeances,
    prix_final: prixFinal,
    duree_validite_jours: dureeValiditeJours || '',
    moyen_paiement_propose: moyenPaiementRaw,
    statut: OFFER_STATUS.DRAFT,
    token_hash: tokenHash,
    date_proposition: new Date(),
    date_expiration_lien: expirationDate,
    date_envoi: '',
    date_consultation: '',
    date_reponse: '',
    notes_admin: '',
    package_id_resultant: '',
  });
  writeAuditLog_('admin', 'create_package_offer', offerId, '', `${nom} — ${prixFinal}`, '');

  const sendNow = ui.alert('Marquer cette offre comme envoyée maintenant ?', ui.ButtonSet.YES_NO);
  if (sendNow === ui.Button.YES) {
    updateRow_(TABS.PACKAGE_OFFERS, findOfferById_(offerId).rowNumber, {
      statut: OFFER_STATUS.SENT,
      date_envoi: new Date(),
    });
    writeAuditLog_('admin', 'mark_offer_sent', offerId, OFFER_STATUS.DRAFT, OFFER_STATUS.SENT, '');
  }

  const offerUrl = buildOfferUrl_(offerId, rawToken);
  showCopyableLinkDialog_(
    'Offre créée',
    'Ce lien ne sera plus jamais affiché ici — copie-le maintenant pour l\'envoyer par WhatsApp ou email :',
    offerUrl
  );
}

/** Pour une offre restée "draft" (créée mais pas encore envoyée) : la marquer envoyée sans régénérer le lien. */
function adminMarkOfferSent() {
  const ui = ui_();
  const offerId = ui.prompt('offer_id à marquer comme envoyée :').getResponseText().trim();
  const offer = findOfferById_(offerId);
  if (!offer) { ui.alert('Offre introuvable.'); return; }
  if (offer.statut !== OFFER_STATUS.DRAFT) { ui.alert(`Cette offre est déjà au statut "${offer.statut}".`); return; }

  updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, { statut: OFFER_STATUS.SENT, date_envoi: new Date() });
  writeAuditLog_('admin', 'mark_offer_sent', offerId, OFFER_STATUS.DRAFT, OFFER_STATUS.SENT, '');
  ui.alert('Offre marquée comme envoyée.');
}

function adminCancelOffer() {
  const ui = ui_();
  const offerId = ui.prompt('offer_id à annuler :').getResponseText().trim();
  const offer = findOfferById_(offerId);
  if (!offer) { ui.alert('Offre introuvable.'); return; }
  if ([OFFER_STATUS.PAID, OFFER_STATUS.CANCELLED].indexOf(offer.statut) !== -1) {
    ui.alert(`Cette offre est déjà "${offer.statut}", rien à annuler.`);
    return;
  }
  const motif = ui.prompt('Motif de l\'annulation (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire, opération annulée.'); return; }

  updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, { statut: OFFER_STATUS.CANCELLED });
  writeAuditLog_('admin', 'cancel_offer', offerId, offer.statut, OFFER_STATUS.CANCELLED, motif);
  ui.alert('Offre annulée.');
}

/**
 * Convertit une offre en forfait réel. N'autorise la conversion que si
 * statut = accepted (ou dérogation explicite motivée). Vérifie et marque
 * package_id_resultant À L'INTÉRIEUR d'un ScriptLock, immédiatement après
 * la création du forfait — ferme la fenêtre de double-conversion en cas de
 * double-clic sur le menu. Réutilise ensuite promptAndRecordPayment_
 * (Payments.gs), exactement comme adminAddPackage — rien n'est dupliqué.
 */
function adminConvertOfferToPackage() {
  const ui = ui_();
  const offerId = ui.prompt('offer_id à convertir en forfait :').getResponseText().trim();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert('Le système est occupé, réessaie dans un instant.'); return; }

  let packageId;
  try {
    const offer = findOfferById_(offerId);
    if (!offer) { ui.alert('Offre introuvable.'); return; }

    // Intégrité : une offre ne peut être convertie qu'une seule fois.
    if (offer.package_id_resultant) {
      ui.alert(`Cette offre a déjà été convertie en forfait ${offer.package_id_resultant}.`);
      return;
    }

    let motifOverride = '';
    if (offer.statut !== OFFER_STATUS.ACCEPTED) {
      const override = ui.alert(
        `Cette offre n'est pas au statut "accepted" (statut actuel : "${offer.statut}").\n\n` +
        'Forcer la conversion quand même (dérogation) ?',
        ui.ButtonSet.YES_NO
      );
      if (override !== ui.Button.YES) { ui.alert('Opération annulée.'); return; }
      motifOverride = ui.prompt('Motif de la dérogation (obligatoire) :').getResponseText().trim();
      if (!motifOverride) { ui.alert('Motif obligatoire pour une dérogation, opération annulée.'); return; }
    }

    const client = findRowBy_(TABS.CLIENTS, 'client_id', offer.client_id);
    if (!client) { ui.alert('Cliente introuvable pour cette offre.'); return; }

    let dateExpirationRaw = '';
    if (offer.duree_validite_jours) {
      const exp = new Date(Date.now() + Number(offer.duree_validite_jours) * 24 * 60 * 60 * 1000);
      dateExpirationRaw = Utilities.formatDate(exp, getSettings().timezone, 'yyyy-MM-dd');
    }

    packageId = genId_('PKG');
    appendRow_(TABS.PACKAGES, {
      package_id: packageId,
      client_id: client.client_id,
      nom_forfait: offer.nom_forfait,
      soins_inclus: offer.soins_inclus,
      total_sessions: Number(offer.nombre_seances),
      available_sessions: Number(offer.nombre_seances),
      reserved_sessions: 0,
      used_sessions: 0,
      date_achat: new Date(),
      date_expiration: dateExpirationRaw,
      moyen_paiement: '',
      statut: PACKAGE_STATUS.PENDING_PAYMENT,
      notes_admin: '',
      package_template_id: offer.package_template_id || '',
    });

    // Marqué IMMÉDIATEMENT, toujours à l'intérieur du verrou : ferme la
    // fenêtre de double-conversion le plus tôt possible.
    updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, { package_id_resultant: packageId });

    writeAuditLog_(
      'admin', 'convert_offer_to_package', offerId, offer.statut, packageId,
      motifOverride ? `Dérogation : ${motifOverride}` : 'Conversion normale (offre acceptée)'
    );
  } finally {
    lock.releaseLock();
  }

  // Saisie du paiement HORS du verrou (interactive, potentiellement longue) —
  // n'a pas besoin d'être dans la même section critique : package_id_resultant
  // est déjà marqué, donc aucune double-conversion n'est plus possible ici.
  const dejaRecu = ui.alert(`Forfait créé : ${packageId} (pending_payment).\n\nLe paiement est-il déjà reçu ?`, ui.ButtonSet.YES_NO);
  if (dejaRecu !== ui.Button.YES) {
    ui.alert(`Forfait ${packageId} reste "pending_payment" — utilise "Enregistrer un paiement" une fois reçu.`);
    return;
  }
  const paymentId = promptAndRecordPayment_(packageId, { forceConfirmed: true });
  if (!paymentId) {
    ui.alert(`Forfait ${packageId} créé, mais la saisie du paiement a été annulée — reste "pending_payment".`);
    return;
  }
  ui.alert(`Forfait ${packageId} activé (paiement ${paymentId}). L'offre ${offerId} passera à "paid" automatiquement.`);
}

// ─────────────────────────────────────────────────────────────────────────
//  Fonctions publiques (appelées depuis WebApp.gs — page cliente /offer/:id)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Valide le jeton (haché) et l'expiration d'une offre. Lève une erreur
 * métier générique en cas d'échec — jamais de détail technique exposé.
 */
function validateOfferToken_(offerId, tokenPlain) {
  if (!offerId || !tokenPlain) {
    throw new BookingBusinessError_('Lien invalide.');
  }
  const offer = findOfferById_(offerId);
  if (!offer) {
    throw new BookingBusinessError_('Lien invalide ou expiré.');
  }
  const tokenHash = hashWithPepper_(tokenPlain);
  if (offer.token_hash !== tokenHash) {
    throw new BookingBusinessError_('Lien invalide ou expiré.');
  }
  if (offer.date_expiration_lien && new Date(offer.date_expiration_lien) < new Date()) {
    if (offer.statut !== OFFER_STATUS.EXPIRED) {
      updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, { statut: OFFER_STATUS.EXPIRED });
      writeAuditLog_('system', 'offer_expired_on_access', offer.offer_id, offer.statut, OFFER_STATUS.EXPIRED, '');
    }
    throw new BookingBusinessError_('Ce lien a expiré. Contacte l\'institut pour une nouvelle offre.');
  }
  if ([OFFER_STATUS.CANCELLED, OFFER_STATUS.DECLINED].indexOf(offer.statut) !== -1) {
    throw new BookingBusinessError_('Cette offre n\'est plus disponible.');
  }
  return offer;
}

/**
 * Consultation de l'offre par la cliente. C'EST CET APPEL BACKEND (et lui
 * seul) qui fait passer draft/sent -> viewed — jamais le frontend seul, pour
 * qu'un lien expiré ou déjà répondu ne puisse jamais s'afficher depuis un
 * cache navigateur sans revalidation serveur.
 */
function getOfferDetails(offerId, tokenPlain) {
  const offer = validateOfferToken_(offerId, tokenPlain);

  if ([OFFER_STATUS.DRAFT, OFFER_STATUS.SENT].indexOf(offer.statut) !== -1) {
    updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, {
      statut: OFFER_STATUS.VIEWED,
      date_consultation: new Date(),
    });
    writeAuditLog_(offer.client_id, 'offer_viewed', offer.offer_id, offer.statut, OFFER_STATUS.VIEWED, '');
  }

  const client = findRowBy_(TABS.CLIENTS, 'client_id', offer.client_id);
  const refreshed = findOfferById_(offerId); // relire après la mise à jour éventuelle ci-dessus
  return {
    prenom: client ? client.prenom : '',
    nomForfait: refreshed.nom_forfait,
    soinsInclus: String(refreshed.soins_inclus || '').split(',').map((s) => s.trim()),
    nombreSeances: Number(refreshed.nombre_seances),
    prixFinal: Number(refreshed.prix_final),
    dureeValiditeJours: refreshed.duree_validite_jours || null,
    moyenPaiementPropose: refreshed.moyen_paiement_propose,
    statut: refreshed.statut,
  };
}

/**
 * Réponse de la cliente (accepter/refuser). Ne crée jamais de forfait, ne
 * débite jamais rien — uniquement un changement de statut. Refuse toute
 * réponse si l'offre a déjà été répondue/payée/annulée.
 */
function respondToOffer(offerId, tokenPlain, response) {
  if (['accept', 'decline'].indexOf(response) === -1) {
    throw new BookingBusinessError_('Réponse invalide.');
  }
  const offer = validateOfferToken_(offerId, tokenPlain);
  if ([OFFER_STATUS.SENT, OFFER_STATUS.VIEWED].indexOf(offer.statut) === -1) {
    throw new BookingBusinessError_('Cette offre a déjà reçu une réponse ou n\'est plus modifiable.');
  }

  const newStatus = response === 'accept' ? OFFER_STATUS.ACCEPTED : OFFER_STATUS.DECLINED;
  updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, {
    statut: newStatus,
    date_reponse: new Date(),
  });
  writeAuditLog_(offer.client_id, 'offer_' + response + 'ed_by_client', offer.offer_id, offer.statut, newStatus, '');

  return { statut: newStatus };
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 16 — Notifications.gs (Phase 2, Étape C — confirmation, rappels, alertes)
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  NOTIFICATIONS.gs — Confirmation post-achat, rappels de solde/expiration,
 *  alertes de renouvellement (Phase 2, Étape C).
 * ============================================================================
 *
 *  Distinction stricte, voulue dès le cadrage :
 *  - Confirmation post-achat + rappels de solde/expiration = communications
 *    TRANSACTIONNELLES sur un service déjà acheté — toujours envoyées,
 *    indépendamment de Clients.consentement_marketing.
 *  - Alerte de renouvellement : JAMAIS un email à la cliente. Seulement une
 *    ligne visible par l'administratrice (Reconciliation_Issues), à elle de
 *    décider d'agir. Si elle choisit de proposer un renouvellement, ça passe
 *    par "Proposer un forfait" (PackageOffers.gs) — jamais un envoi
 *    automatique, et ce parcours reste soumis au consentement de la cliente.
 *
 *  Dédoublonnage : chaque rappel envoyé est enregistré dans Reminders_Sent
 *  (client_id, package_id, reminder_type) — jamais renvoyé deux fois pour la
 *  même combinaison, y compris entre deux exécutions du déclencheur quotidien.
 */

function hasReminderBeenSent_(clientId, packageId, reminderType) {
  return readAllRows_(TABS.REMINDERS_SENT).some((r) =>
    r.client_id === clientId && r.package_id === packageId && r.reminder_type === reminderType
  );
}

function recordReminderSent_(clientId, packageId, reminderType) {
  appendRow_(TABS.REMINDERS_SENT, {
    reminder_id: genId_('RMD'),
    client_id: clientId,
    package_id: packageId,
    reminder_type: reminderType,
    sent_at: new Date(),
  });
}

/**
 * Confirmation post-achat — appelée depuis activatePackageIfPending_
 * (Payments.gs) au moment exact où un forfait devient actif. Dédoublonnée
 * comme les autres rappels : n'est jamais renvoyée deux fois pour le même
 * forfait, même si la fonction est appelée plusieurs fois par erreur.
 */
function sendPostPurchaseConfirmation_(packageId) {
  const pkg = findPackageById_(packageId);
  if (!pkg) return;
  if (hasReminderBeenSent_(pkg.client_id, packageId, REMINDER_TYPE.POST_ACHAT)) return;

  const client = findRowBy_(TABS.CLIENTS, 'client_id', pkg.client_id);
  if (!client || !client.email) return; // rien à envoyer si pas d'email connu

  const settings = getSettings();
  const subject = `Confirmation de votre forfait — ${pkg.nom_forfait}`;
  const body = [
    `Bonjour ${client.prenom || ''},`,
    '',
    `Votre forfait "${pkg.nom_forfait}" est maintenant actif.`,
    '',
    `Séances achetées : ${pkg.total_sessions}`,
    pkg.date_expiration
      ? `Durée de validité : jusqu'au ${formatDateForReport_(pkg.date_expiration)}`
      : `Durée de validité : aucune limite`,
    '',
    `Pour réserver vos séances : ${settings.site_base_url}/use-package`,
    '',
    `Règle d'annulation : une annulation effectuée moins de ${settings.cancellation_deadline_hours}h ` +
      `avant le rendez-vous est considérée comme une séance utilisée, sauf accord exceptionnel de notre part.`,
    '',
    'Elysian Paris',
  ].join('\n');

  MailApp.sendEmail(client.email, subject, body);
  recordReminderSent_(pkg.client_id, packageId, REMINDER_TYPE.POST_ACHAT);
  writeAuditLog_('system', 'send_post_purchase_confirmation', packageId, '', 'sent', '');
}

function sendBalanceReminderEmail_(client, pkg, sessionsRemaining, settings) {
  const subject = sessionsRemaining > 0
    ? `Il vous reste ${sessionsRemaining} séance(s) — ${pkg.nom_forfait}`
    : `Votre forfait ${pkg.nom_forfait} est entièrement utilisé`;
  const body = [
    `Bonjour ${client.prenom || ''},`,
    '',
    sessionsRemaining > 0
      ? `Il vous reste ${sessionsRemaining} séance(s) sur votre forfait "${pkg.nom_forfait}".`
      : `Vous avez utilisé toutes les séances de votre forfait "${pkg.nom_forfait}".`,
    '',
    `Pour réserver : ${settings.site_base_url}/use-package`,
    '',
    'Elysian Paris',
  ].join('\n');
  MailApp.sendEmail(client.email, subject, body);
}

function sendExpirationReminderEmail_(client, pkg, daysBefore, settings) {
  const subject = `Votre forfait ${pkg.nom_forfait} expire dans ${daysBefore} jours`;
  const body = [
    `Bonjour ${client.prenom || ''},`,
    '',
    `Votre forfait "${pkg.nom_forfait}" expire le ${formatDateForReport_(pkg.date_expiration)}.`,
    `Il vous reste ${pkg.available_sessions} séance(s) disponible(s).`,
    '',
    `Pour réserver : ${settings.site_base_url}/use-package`,
    '',
    'Elysian Paris',
  ].join('\n');
  MailApp.sendEmail(client.email, subject, body);
}

/**
 * Fonction quotidienne (déclencheur horaire à ajouter manuellement, voir
 * README — même principe que runReconciliationCheck) : rappels de solde,
 * rappels d'expiration, et alertes de renouvellement pour l'administratrice.
 */
function runDailyNotifications() {
  const settings = getSettings();
  const balanceThresholds = String(settings.reminder_low_balance_thresholds)
    .split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
  const expirationDaysList = String(settings.reminder_days_before_expiration)
    .split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
  const renewalWindowDays = expirationDaysList.length ? Math.min.apply(null, expirationDaysList) : 7;

  const packages = readAllRows_(TABS.PACKAGES).filter((p) => p.statut === PACKAGE_STATUS.ACTIVE);
  const now = new Date();
  let actionsCount = 0;

  packages.forEach((pkg) => {
    const client = findRowBy_(TABS.CLIENTS, 'client_id', pkg.client_id);
    const available = Number(pkg.available_sessions);

    let daysUntilExpiration = null;
    if (pkg.date_expiration) {
      const exp = new Date(pkg.date_expiration);
      if (!isNaN(exp.getTime())) {
        daysUntilExpiration = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      }
    }

    if (client && client.email) {
      // --- Rappels de solde ---
      balanceThresholds.forEach((threshold) => {
        if (available !== threshold) return;
        const type = REMINDER_TYPE.balance(threshold);
        if (hasReminderBeenSent_(pkg.client_id, pkg.package_id, type)) return;
        sendBalanceReminderEmail_(client, pkg, threshold, settings);
        recordReminderSent_(pkg.client_id, pkg.package_id, type);
        actionsCount++;
      });

      // --- Rappels d'expiration ---
      if (daysUntilExpiration !== null) {
        expirationDaysList.forEach((days) => {
          if (daysUntilExpiration !== days) return;
          const type = REMINDER_TYPE.expiration(days);
          if (hasReminderBeenSent_(pkg.client_id, pkg.package_id, type)) return;
          sendExpirationReminderEmail_(client, pkg, days, settings);
          recordReminderSent_(pkg.client_id, pkg.package_id, type);
          actionsCount++;
        });
      }
    }

    // --- Alerte de renouvellement : jamais un email, uniquement une ligne
    // pour l'administratrice. Une seule fois par forfait (pas de répétition
    // quotidienne du même signal une fois qu'il a été levé). ---
    const nearCompletion = available <= 1;
    const nearExpiration = daysUntilExpiration !== null && daysUntilExpiration <= renewalWindowDays;
    if ((nearCompletion || nearExpiration) && !hasReminderBeenSent_(pkg.client_id, pkg.package_id, REMINDER_TYPE.RENEWAL_ALERT)) {
      appendRow_(TABS.RECONCILIATION_ISSUES, {
        timestamp_detection: new Date(),
        type_anomalie: 'renewal_opportunity',
        entite_concernee: pkg.package_id,
        details: `Forfait bientôt terminé (disponibles=${available}) ou proche expiration ` +
          `(${daysUntilExpiration !== null ? daysUntilExpiration + ' jours' : 'sans date'}) — ` +
          `décision de renouvellement à prendre manuellement. Consentement marketing : ` +
          `${client ? (client.consentement_marketing || 'non renseigné') : 'cliente introuvable'}.`,
        statut: 'a_verifier',
        resolution_notes: '',
      });
      recordReminderSent_(pkg.client_id, pkg.package_id, REMINDER_TYPE.RENEWAL_ALERT);
      actionsCount++;
    }
  });

  Logger.log(`Notifications quotidiennes : ${actionsCount} action(s) effectuée(s).`);
  return actionsCount;
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 17 — Dashboard.gs (Phase 2, Étape C + Reporting — tableau de bord, historique)
// ════════════════════════════════════════════════════════════════════════

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
  };

  return { rows, snapshot };
}

// ════════════════════════════════════════════════════════════════════════
//  SECTION 18 — CRM.gs (tags, historique des notes, recherche de clientes)
// ════════════════════════════════════════════════════════════════════════

/**
 * ============================================================================
 *  CRM.gs — Tags, historique des notes, recherche de clientes.
 * ============================================================================
 *
 *  Étend Fiche_Client (ClientProfile.gs) sans dupliquer sa logique :
 *  - `Clients.tags` : segmentation libre (VIP, à risque, nouvelle...).
 *  - `Client_Notes` : historique des notes, jamais écrasé — contrairement à
 *    `Clients.notes_admin` qui reste une note "épinglée" rapide, remplacée à
 *    chaque modification. `adminViewClientProfile` (ClientProfile.gs) affiche
 *    les deux.
 *  - Recherche/segmentation de clientes par critère, résultat dans un onglet
 *    de rapport régénéré à la demande (même principe que Fiche_Client/Dashboard).
 *
 *  Rien de nouveau côté scopes ni côté données sensibles.
 */

// ─────────────────────────────────────────────────────────────────────────
//  Tags
// ─────────────────────────────────────────────────────────────────────────

function parseTags_(tagsRaw) {
  return String(tagsRaw || '').split(',').map((t) => t.trim()).filter((t) => t.length > 0);
}

function adminAddClientTag() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Cliente introuvable.'); return; }

  const tagToAdd = ui.prompt('Tag à ajouter (ex. vip, a-risque, nouvelle) :').getResponseText().trim().toLowerCase();
  if (!tagToAdd) { ui.alert('Tag vide, opération annulée.'); return; }

  const tags = parseTags_(client.tags);
  if (tags.indexOf(tagToAdd) !== -1) { ui.alert(`Cette cliente a déjà le tag "${tagToAdd}".`); return; }

  tags.push(tagToAdd);
  updateRow_(TABS.CLIENTS, client.rowNumber, { tags: tags.join(', ') });
  writeAuditLog_('admin', 'add_client_tag', client.client_id, client.tags || '', tags.join(', '), '');
  ui.alert(`Tag "${tagToAdd}" ajouté. Tags actuels : ${tags.join(', ')}`);
}

function adminRemoveClientTag() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Cliente introuvable.'); return; }

  const tags = parseTags_(client.tags);
  if (tags.length === 0) { ui.alert('Cette cliente n\'a aucun tag.'); return; }

  const tagToRemove = ui.prompt(`Tags actuels : ${tags.join(', ')}\n\nTag à retirer :`).getResponseText().trim().toLowerCase();
  const newTags = tags.filter((t) => t !== tagToRemove);
  if (newTags.length === tags.length) { ui.alert(`Tag "${tagToRemove}" introuvable sur cette cliente.`); return; }

  updateRow_(TABS.CLIENTS, client.rowNumber, { tags: newTags.join(', ') });
  writeAuditLog_('admin', 'remove_client_tag', client.client_id, tags.join(', '), newTags.join(', '), '');
  ui.alert(`Tag "${tagToRemove}" retiré. Tags actuels : ${newTags.join(', ') || '(aucun)'}`);
}

// ─────────────────────────────────────────────────────────────────────────
//  Historique des notes
// ─────────────────────────────────────────────────────────────────────────

function findClientNotes_(clientId) {
  return readAllRows_(TABS.CLIENT_NOTES)
    .filter((n) => n.client_id === clientId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function adminAddClientNote() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Cliente introuvable.'); return; }

  const note = ui.prompt('Note à ajouter à l\'historique :').getResponseText().trim();
  if (!note) { ui.alert('Note vide, opération annulée.'); return; }

  appendRow_(TABS.CLIENT_NOTES, {
    note_id: genId_('NOTE'),
    client_id: client.client_id,
    timestamp: new Date(),
    auteur: Session.getActiveUser().getEmail() || 'admin',
    note: note,
  });
  writeAuditLog_('admin', 'add_client_note', client.client_id, '', note, '');
  ui.alert('Note ajoutée à l\'historique.');
}

// ─────────────────────────────────────────────────────────────────────────
//  Recherche / segmentation de clientes
// ─────────────────────────────────────────────────────────────────────────

/** Date du dernier paiement confirmé d'une cliente, ou null si aucun. */
function findLastConfirmedPaymentDate_(clientId, payments) {
  const clientPayments = payments
    .filter((p) => p.client_id === clientId && p.statut_paiement === PAYMENT_STATUS.CONFIRME)
    .map((p) => new Date(p.date_paiement))
    .filter((d) => !isNaN(d.getTime()));
  if (clientPayments.length === 0) return null;
  return new Date(Math.max.apply(null, clientPayments));
}

function adminSearchClients() {
  const ui = ui_();
  const criteria = ui.prompt(
    'Critère de recherche :\n' +
    '- "tag:<nom>" (ex. tag:vip)\n' +
    '- "sans_achat:<jours>" (aucun paiement confirmé depuis N jours, ou jamais)\n' +
    '- "expiration:<jours>" (forfait actif expirant dans ≤ N jours)\n' +
    '- "source:<valeur>" (ex. source:classpass — d\'après Bookings.source)'
  ).getResponseText().trim().toLowerCase();

  const [type, argRaw] = criteria.split(':').map((s) => s.trim());
  const clients = readAllRows_(TABS.CLIENTS);
  const packages = readAllRows_(TABS.PACKAGES);
  const payments = readAllRows_(TABS.PAYMENTS);
  const bookings = readAllRows_(TABS.BOOKINGS);
  const now = new Date();
  let matched = [];
  let label = '';

  if (type === 'tag') {
    label = `Tag = "${argRaw}"`;
    matched = clients.filter((c) => parseTags_(c.tags).indexOf(argRaw) !== -1);
  } else if (type === 'sans_achat') {
    const days = parseInt(argRaw, 10);
    if (isNaN(days)) { ui.alert('Nombre de jours invalide.'); return; }
    label = `Aucun paiement confirmé depuis ≥ ${days} jours (ou jamais)`;
    matched = clients.filter((c) => {
      const lastDate = findLastConfirmedPaymentDate_(c.client_id, payments);
      if (!lastDate) return true;
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
      return daysSince >= days;
    });
  } else if (type === 'expiration') {
    const days = parseInt(argRaw, 10);
    if (isNaN(days)) { ui.alert('Nombre de jours invalide.'); return; }
    label = `Forfait actif expirant dans ≤ ${days} jours`;
    const clientIdsNearExpiry = new Set(
      packages.filter((p) => {
        if (p.statut !== PACKAGE_STATUS.ACTIVE || !p.date_expiration) return false;
        const exp = new Date(p.date_expiration);
        if (isNaN(exp.getTime())) return false;
        const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        return daysUntil >= 0 && daysUntil <= days;
      }).map((p) => p.client_id)
    );
    matched = clients.filter((c) => clientIdsNearExpiry.has(c.client_id));
  } else if (type === 'source') {
    label = `Source de réservation = "${argRaw}"`;
    const clientIdsWithSource = new Set(
      bookings.filter((b) => b.source === argRaw).map((b) => b.client_id)
    );
    matched = clients.filter((c) => clientIdsWithSource.has(c.client_id));
  } else {
    ui.alert('Critère invalide. Utilise le format "type:valeur" (ex. tag:vip).');
    return;
  }

  const rows = [
    [`Recherche : ${label} — ${matched.length} résultat(s)`, '', '', '', ''],
    ['client_id', 'prenom', 'nom', 'email', 'telephone'],
    ...matched.map((c) => [c.client_id, c.prenom, c.nom, c.email, c.telephone]),
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TABS.CLIENT_SEARCH_RESULTS);
  if (!sheet) {
    sheet = ss.insertSheet(TABS.CLIENT_SEARCH_RESULTS);
  }
  sheet.clear();
  sheet.getRange(1, 1, rows.length, 5).setValues(rows);
  sheet.autoResizeColumns(1, 5);
  ss.setActiveSheet(sheet);

  ui.alert(`${matched.length} cliente(s) trouvée(s), résultat dans l'onglet "${TABS.CLIENT_SEARCH_RESULTS}".`);
}
