/**
 * ============================================================================
 *  PORTAL.gs — Portail web : vue cliente ("où en suis-je ?") et vue admin
 *  ("où en sont toutes mes clientes ?"), au lieu d'ouvrir le Sheet à la main.
 * ============================================================================
 *
 *  Authentification admin volontairement simple (mot de passe unique,
 *  jamais stocké en clair) : un seul compte, pas de rôles, pas de jeton de
 *  session à gérer — chaque appel admin renvoie le mot de passe, vérifié
 *  côté serveur à chaque fois. Protégé par le même anti brute-force que le
 *  reste du site (Security.gs).
 */

/** Renvoie le hash du mot de passe admin, ou null si jamais configuré (voir AdminMenu.gs → adminSetPortalPassword). */
function getAdminPasswordHash_() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PORTAL_PASSWORD_HASH') || null;
}

/**
 * Définit (ou change) le mot de passe du portail admin — jamais stocké en
 * clair, seulement son hash HMAC (même primitive que les codes/jetons,
 * Security.gs). À lancer depuis le menu Sheet, une seule fois pour
 * initialiser, ou à nouveau pour changer le mot de passe.
 */
function adminSetPortalPassword() {
  const ui = ui_();
  const response = ui.prompt('Nouveau mot de passe du portail admin (8 caractères minimum) :');
  const password = response.getResponseText().trim();
  if (password.length < 8) {
    ui.alert('Mot de passe trop court — inchangé (8 caractères minimum).');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('ADMIN_PORTAL_PASSWORD_HASH', hashWithPepper_(password));
  writeAuditLog_('admin', 'set_portal_password', 'admin_portal', '', '', '');
  ui.alert('Mot de passe du portail admin mis à jour.');
}

/**
 * Vérifie le mot de passe admin. Lève une erreur générique (jamais de détail
 * sur la cause) en cas d'échec, de blocage anti brute-force, ou si aucun mot
 * de passe n'a encore été configuré.
 */
function authenticateAdmin_(passwordPlain) {
  const settings = getSettings();
  enforceNotLockedOutForAdmin_(settings);

  const storedHash = getAdminPasswordHash_();
  const providedHash = passwordPlain ? hashWithPepper_(String(passwordPlain)) : '';

  if (!storedHash || !passwordPlain || providedHash !== storedHash) {
    recordFailedAdminAttempt_(settings);
    throw new BookingBusinessError_('Mot de passe incorrect.');
  }
  clearFailedAdminAttempts_();
}

/**
 * Codes promo actifs et disponibles pour une cliente donnée : réservés à
 * elle (client_id correspondant) ou génériques (client_id vide), actifs, non
 * expirés et pas encore épuisés. Mêmes conditions que
 * validatePromoCodeForClient_ (PromoCodes.gs), en lecture seule ici.
 */
function findActivePromoCodesForClient_(clientId) {
  const now = new Date();
  return readAllRows_(TABS.PROMO_CODES).filter((p) => {
    if (p.statut !== PROMO_CODE_STATUS.ACTIVE) return false;
    if (p.client_id && p.client_id !== clientId) return false;
    if (p.date_expiration) {
      const exp = new Date(p.date_expiration);
      if (!isNaN(exp.getTime()) && exp < now) return false;
    }
    const usageMax = Number(p.usage_max) || 1;
    const usageCount = Number(p.usage_count) || 0;
    if (usageCount >= usageMax) return false;
    return true;
  }).map((p) => ({
    code: p.code,
    discountType: p.type,
    discountValue: Number(p.value),
  }));
}

/**
 * Vue d'ensemble admin : chaque cliente, ses forfaits actifs et les codes
 * promo qui lui sont applicables. Lecture seule, aucune écriture.
 */
function adminGetClientsOverview_(passwordPlain) {
  authenticateAdmin_(passwordPlain);

  const packagesByClient = {};
  readAllRows_(TABS.PACKAGES).forEach((pkg) => {
    if (pkg.statut !== PACKAGE_STATUS.ACTIVE) return;
    (packagesByClient[pkg.client_id] = packagesByClient[pkg.client_id] || []).push({
      packageName: pkg.nom_forfait,
      availableSessions: Number(pkg.available_sessions),
      totalSessions: Number(pkg.total_sessions),
      dateExpiration: pkg.date_expiration || '',
    });
  });

  return readAllRows_(TABS.CLIENTS).map((c) => ({
    clientId: c.client_id,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone,
    packages: packagesByClient[c.client_id] || [],
    activePromoCodes: findActivePromoCodesForClient_(c.client_id),
  }));
}
