/**
 * ============================================================================
 *  NEWSLETTER.gs — Inscription newsletter (site) → contact Brevo.
 * ============================================================================
 *
 *  Domaine volontairement séparé du CRM opérationnel (Clients, Bookings...) :
 *  une inscription newsletter n'implique ni cliente ni forfait. Brevo reste la
 *  seule source de vérité pour cette liste (désinscription, segmentation,
 *  envoi de campagnes) — aucune duplication dans le Sheet, contrairement au
 *  reste de ce système. MailApp (script.send_mail) ne convient pas pour de
 *  l'envoi de campagnes : quota bas, pas de gestion de désinscription/
 *  déliverabilité — Brevo est fait pour ça.
 */

const BREVO_API_BASE = 'https://api.brevo.com/v3';

/** Renvoie la clé API Brevo, ou lève une erreur claire si jamais configurée. */
function getBrevoApiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
  if (!key) {
    throw new Error('Brevo n\'est pas configuré (BREVO_API_KEY manquante) — voir menu Elysian Admin > Portail web.');
  }
  return key;
}

/** Définit (ou change) la clé API Brevo — jamais affichée en clair après saisie, jamais dans Git/le Sheet. */
function adminSetBrevoApiKey() {
  const ui = ui_();
  const response = ui.prompt('Clé API Brevo (Brevo > Paramètres SMTP & API > Clés API) :');
  const key = response.getResponseText().trim();
  if (!key) {
    ui.alert('Clé vide — inchangée.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('BREVO_API_KEY', key);
  writeAuditLog_('admin', 'set_brevo_api_key', 'brevo', '', 'set', '');
  ui.alert('Clé Brevo enregistrée.');
}

/**
 * ID de liste Brevo optionnel où ranger les inscrites (Brevo > Contacts >
 * Listes > l'ID apparaît dans l'URL de la liste). Réglage optionnel : sans
 * lui, le contact est quand même créé/mis à jour dans Brevo, juste non
 * rangé dans une liste précise — fonctionne dès le départ, s'améliore une
 * fois ce réglage renseigné.
 */
function adminSetBrevoNewsletterListId() {
  const ui = ui_();
  const response = ui.prompt('ID de la liste Brevo pour la newsletter (nombre, visible dans l\'URL de la liste sur Brevo) :');
  const id = response.getResponseText().trim();
  if (!id || isNaN(Number(id))) {
    ui.alert('ID invalide (doit être un nombre) — inchangé.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('BREVO_NEWSLETTER_LIST_ID', id);
  ui.alert(`Liste newsletter Brevo enregistrée (ID ${id}).`);
}

/**
 * Inscription publique à la newsletter, appelée depuis le site (formulaire
 * dans Footer.tsx). updateEnabled: true rend l'appel idempotent — une même
 * adresse peut se réinscrire sans jamais provoquer d'erreur.
 */
function subscribeToNewsletter_(email, prenom) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.indexOf('@') === -1) {
    throw new BookingBusinessError_('Adresse email invalide.');
  }

  enforceNewsletterRateLimit_(normalizedEmail);

  const listId = PropertiesService.getScriptProperties().getProperty('BREVO_NEWSLETTER_LIST_ID');
  const payload = {
    email: normalizedEmail,
    updateEnabled: true,
  };
  const trimmedPrenom = String(prenom || '').trim();
  if (trimmedPrenom) {
    payload.attributes = { FIRSTNAME: trimmedPrenom };
  }
  if (listId) {
    payload.listIds = [Number(listId)];
  }

  const response = UrlFetchApp.fetch(`${BREVO_API_BASE}/contacts`, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'api-key': getBrevoApiKey_(), accept: 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status >= 300) {
    const detail = `${status} ${response.getContentText()}`;
    Logger.log('Erreur Brevo (subscribeToNewsletter_) : ' + detail);
    notifyAdminOfBrevoFailure_(detail);
    throw new BookingBusinessError_('Une erreur est survenue, merci de réessayer.');
  }

  return { status: 'subscribed' };
}

/**
 * Alerte l'administratrice par email dès qu'un appel à Brevo échoue —
 * bien plus fiable à découvrir qu'un journal d'exécution Apps Script.
 * Ne lève jamais elle-même (appelée depuis un contexte qui gère déjà
 * l'erreur d'origine).
 */
function notifyAdminOfBrevoFailure_(detail) {
  try {
    const adminEmail = Session.getEffectiveUser().getEmail();
    if (!adminEmail) return;
    MailApp.sendEmail(
      adminEmail,
      'Erreur Brevo — inscription newsletter',
      `Une inscription à la newsletter a échoué côté Brevo.\n\nDétail technique :\n${detail}\n\n` +
        `Vérifie la clé API Brevo (menu Elysian Admin > Portail web > Définir la clé API Brevo).`
    );
  } catch (e) {
    // Rien de plus à faire si même cet email échoue.
  }
}

/** Anti-spam dédié, même principe que enforceClaimRateLimit_ (PackageClaims.gs). */
function enforceNewsletterRateLimit_(email) {
  const props = PropertiesService.getScriptProperties();
  const key = 'newsletter_count::' + email;
  const windowKey = 'newsletter_window::' + email;
  const windowStart = props.getProperty(windowKey);
  const now = Date.now();

  if (!windowStart || now - Number(windowStart) > 60 * 60 * 1000) {
    props.setProperty(windowKey, String(now));
    props.setProperty(key, '1');
    return;
  }
  const count = parseInt(props.getProperty(key) || '0', 10) + 1;
  if (count > 5) {
    throw new RateLimitError_('Too many requests. Please try again later.');
  }
  props.setProperty(key, String(count));
}
