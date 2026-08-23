/**
 * ============================================================================
 *  ABROADREQUESTS.gs — Demandes de réservation "sur demande" (/book-abroad).
 * ============================================================================
 *
 *  /book-abroad n'a ni calendrier ni compte : la cliente envoie ses
 *  coordonnées et disponibilités, l'administratrice organise le rendez-vous
 *  elle-même une fois sur place. Jusqu'ici, la seule trace de ces demandes
 *  était le message WhatsApp lui-même — rien dans le Sheet, aucune alerte si
 *  le message WhatsApp n'aboutissait pas (fenêtre bloquée, cliente qui ferme
 *  avant l'envoi...). Ce fichier ajoute la même paire trace-Sheet + email
 *  admin que la liste d'attente (Waitlist.gs), pour cohérence.
 *
 *  Appelé en tâche de fond (fire-and-forget) depuis BookAbroad.tsx, JAMAIS
 *  attendu avant window.open(whatsapp...) — un popup ouvert hors du geste
 *  utilisateur direct (après un await réseau) serait bloqué par le
 *  navigateur. Une panne de ce endpoint ne doit donc jamais empêcher la
 *  cliente d'envoyer son message WhatsApp.
 */

function submitAbroadRequest_(prenom, email, country, treatment, dates, message) {
  const trimmedPrenom = String(prenom || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!trimmedPrenom || !normalizedEmail || normalizedEmail.indexOf('@') === -1) {
    throw new BookingBusinessError_('Requête incomplète.');
  }

  enforceAbroadRequestRateLimit_(normalizedEmail);

  appendRow_(TABS.ABROAD_REQUESTS, {
    request_id: genId_('ABR'),
    prenom: trimmedPrenom,
    email: normalizedEmail,
    country: String(country || '').trim(),
    treatment: String(treatment || '').trim(),
    dates: String(dates || '').trim(),
    message: String(message || '').trim().slice(0, 500),
    statut: 'nouveau',
    created_at: new Date(),
  });

  try {
    notifyAdminOfAbroadRequest_(trimmedPrenom, normalizedEmail, country, treatment);
  } catch (e) {
    // Ne bloque jamais la demande elle-même : le message WhatsApp reste le
    // canal principal, cet email n'est qu'un filet de sécurité.
  }

  return { status: 'received' };
}

/** Anti-spam dédié, même principe que enforceClaimRateLimit_ (PackageClaims.gs). */
function enforceAbroadRequestRateLimit_(email) {
  const props = PropertiesService.getScriptProperties();
  const key = 'abroad_request_count::' + email;
  const windowKey = 'abroad_request_window::' + email;
  const windowStart = props.getProperty(windowKey);
  const now = Date.now();

  if (!windowStart || now - Number(windowStart) > 60 * 60 * 1000) {
    props.setProperty(windowKey, String(now));
    props.setProperty(key, '1');
    return;
  }
  const count = parseInt(props.getProperty(key) || '0', 10) + 1;
  if (count > 5) {
    throw new RateLimitError_('Too many requests. Please message us directly instead.');
  }
  props.setProperty(key, String(count));
}

function notifyAdminOfAbroadRequest_(prenom, email, country, treatment) {
  const adminEmail = Session.getEffectiveUser().getEmail();
  if (!adminEmail) return;

  const treatmentLabel = TREATMENT_LABELS_ADMIN_[treatment] || treatment || 'non précisé';
  const subject = `Nouvelle demande à l'étranger — ${prenom} (${country || 'pays non précisé'})`;
  const body = [
    `${prenom} (${email}) vient de soumettre une demande de réservation depuis l'étranger.`,
    '',
    `Pays : ${country || 'non précisé'}`,
    `Soin souhaité : ${treatmentLabel}`,
    '',
    `Elle a normalement aussi envoyé un message WhatsApp — vérifie que tu l'as bien reçu.`,
    `Détail complet dans l'onglet Abroad_Requests du Sheet.`,
  ].join('\n');
  MailApp.sendEmail(adminEmail, subject, body);
}

// Miroir minimal de TREATMENT_LABELS (src/lib/contraindications.ts, côté
// site) — uniquement pour rendre l'email admin lisible ; le site envoie déjà
// le libellé exact dans son propre message WhatsApp, donc une valeur
// manquante ici (nouveau soin ajouté côté site, pas encore répercuté ici)
// n'est jamais bloquante : on retombe simplement sur la clé brute.
const TREATMENT_LABELS_ADMIN_ = {
  'lymphatic-drainage': 'Lymphatic Drainage',
  'maderotherapy': 'Maderotherapy',
  'post-op': 'Post-Op Care',
  'prenatal-postnatal': 'Prenatal & Postnatal Massage',
  'cavitation': 'Cavitation Fusion',
};
