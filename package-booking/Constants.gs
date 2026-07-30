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
};

// En-têtes exacts de chaque onglet (ordre = ordre des colonnes).
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

// Statuts possibles d'une réservation (Bookings.status).
const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  CANCELLED_AUTHORIZED: 'cancelled_authorized',
  NO_SHOW_OR_LATE_CANCEL: 'no_show_or_late_cancel',
  RESCHEDULED: 'rescheduled',
};

// Statuts possibles d'un forfait (Packages.statut).
const PACKAGE_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  COMPLETED: 'completed',
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
};

// Durée par défaut d'un soin (minutes) si le site n'en précise pas — le site
// envoie toujours la durée exacte, ceci n'est qu'un filet de sécurité.
const DEFAULT_APPOINTMENT_MINUTES = 60;
