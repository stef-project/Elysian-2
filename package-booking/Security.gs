/**
 * ============================================================================
 *  SECURITY.gs — Hachage, codes de vérification, limitation de fréquence,
 *  jetons de session temporaires.
 * ============================================================================
 *
 *  Rien n'est jamais stocké en clair : les codes et les jetons sont hachés
 *  (SHA-256 + "poivre" secret propre à ce déploiement) avant écriture dans
 *  le Sheet. Le "poivre" vit uniquement dans les Propriétés du script — il
 *  n'apparaît jamais dans Git/GitHub ni dans une cellule du Sheet.
 */

/** Renvoie le "poivre" secret, en le générant une seule fois si absent. */
function getSecretPepper_() {
  const props = PropertiesService.getScriptProperties();
  let pepper = props.getProperty('SECURITY_PEPPER');
  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SECURITY_PEPPER', pepper);
  }
  return pepper;
}

/** Hache une chaîne (code ou jeton) en SHA-256 hexadécimal, avec le poivre secret. */
function hashWithPepper_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value + '::' + getSecretPepper_(),
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
