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
};

// NB : TABS.CLIENT_PROFILE_VIEW ('Fiche_Client') et TABS.DASHBOARD ('Dashboard')
// n'ont volontairement pas d'entrée dans HEADERS — ce sont des onglets de
// rapport en texte libre, recréés à la demande (ClientProfile.gs / Dashboard.gs),
// pas des sources de données tabulaires comme les autres onglets.

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
