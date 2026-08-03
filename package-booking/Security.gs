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

/**
 * Anti brute-force dédié à la validation de codes promo (endpoint public
 * validate-promo, sans OTP contrairement au reste du parcours cliente) —
 * mêmes principes que enforceNotLockedOut_/recordFailedAttempt_ mais sous
 * des clés Properties distinctes ('promo_lockout::'/'promo_failcount::'),
 * pour ne jamais mélanger ce compteur avec celui des codes de vérification.
 */
function enforceNotLockedOutForPromo_(email, settings) {
  const props = PropertiesService.getScriptProperties();
  const key = 'promo_lockout::' + String(email).toLowerCase();
  const lockedUntilRaw = props.getProperty(key);
  if (lockedUntilRaw) {
    const lockedUntil = new Date(lockedUntilRaw);
    if (lockedUntil > new Date()) {
      throw new RateLimitError_('Trop de tentatives de code promo. Réessaie plus tard.');
    }
  }
}

/** Enregistre une tentative de code promo échouée ; déclenche un blocage temporaire si le seuil est dépassé. */
function recordFailedPromoAttempt_(email, settings) {
  const props = PropertiesService.getScriptProperties();
  const countKey = 'promo_failcount::' + String(email).toLowerCase();
  const count = parseInt(props.getProperty(countKey) || '0', 10) + 1;
  props.setProperty(countKey, String(count));

  const maxAttempts = settings.max_promo_validation_attempts || 5;
  if (count >= maxAttempts) {
    const lockedUntil = new Date(Date.now() + settings.lockout_duration_minutes * 60 * 1000);
    props.setProperty('promo_lockout::' + String(email).toLowerCase(), lockedUntil.toISOString());
    props.deleteProperty(countKey);
  }
}

/** Réinitialise le compteur d'échecs de validation promo après une réussite. */
function clearFailedPromoAttempts_(email) {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('promo_failcount::' + String(email).toLowerCase());
  props.deleteProperty('promo_lockout::' + String(email).toLowerCase());
}

/**
 * Anti brute-force dédié au mot de passe du portail admin (un seul compte,
 * donc une clé fixe plutôt que par email) — mêmes principes que
 * enforceNotLockedOut_/recordFailedAttempt_ mais sous des clés Properties
 * distinctes ('admin_lockout'/'admin_failcount').
 *
 * Compromis assumé : la clé étant fixe (pas par IP, GAS Web Apps n'exposent
 * pas l'IP appelante), n'importe qui enchaînant des mots de passe erronés
 * bloque aussi l'admin légitime pour lockout_duration_minutes — un déni de
 * service auto-infligé possible, mais préférable à l'absence totale de
 * protection contre le brute-force, et sans conséquence sur les données
 * (aucun accès obtenu, juste un blocage temporaire du portail).
 */
function enforceNotLockedOutForAdmin_(settings) {
  const props = PropertiesService.getScriptProperties();
  const lockedUntilRaw = props.getProperty('admin_lockout');
  if (lockedUntilRaw) {
    const lockedUntil = new Date(lockedUntilRaw);
    if (lockedUntil > new Date()) {
      throw new RateLimitError_('Trop de tentatives. Réessaie plus tard.');
    }
  }
}

/** Enregistre une tentative de connexion admin échouée ; déclenche un blocage temporaire si le seuil est dépassé. */
function recordFailedAdminAttempt_(settings) {
  const props = PropertiesService.getScriptProperties();
  const count = parseInt(props.getProperty('admin_failcount') || '0', 10) + 1;
  props.setProperty('admin_failcount', String(count));

  const maxAttempts = settings.max_admin_login_attempts || 5;
  if (count >= maxAttempts) {
    const lockedUntil = new Date(Date.now() + settings.lockout_duration_minutes * 60 * 1000);
    props.setProperty('admin_lockout', lockedUntil.toISOString());
    props.deleteProperty('admin_failcount');
  }
}

/** Réinitialise le compteur d'échecs de connexion admin après une réussite. */
function clearFailedAdminAttempts_() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('admin_failcount');
  props.deleteProperty('admin_lockout');
}

/** Erreur dédiée pour les cas de rate limiting, distinguée des erreurs métier. */
function RateLimitError_(message) {
  this.name = 'RateLimitError';
  this.message = message;
}
RateLimitError_.prototype = Object.create(Error.prototype);
