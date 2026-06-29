/**
 * ============================================================================
 *  CODE.gs  —  Cerveau de l'automatisation. (Fichier principal)
 * ============================================================================
 *
 *  Ce que fait processInbox() à chaque exécution :
 *    1. Trouve les nouveaux mails venant du formulaire du site.
 *    2. Ignore ceux déjà traités (label "Auto/Traité").
 *    3. Classe la demande (rendez-vous / prix / services / collab / autre).
 *    4. Si rendez-vous : cherche 2–3 créneaux libres dans Google Calendar.
 *    5. Crée un BROUILLON de réponse (ou l'envoie si CONFIG.SEND_MODE='send').
 *    6. Pose le label de catégorie + le label "Traité".
 *
 *  ⚠️ Par défaut : BROUILLON uniquement. Rien n'est envoyé sans toi.
 * ============================================================================
 */

/**
 * ▶️ Fonction à exécuter (manuellement pour tester, puis via un déclencheur).
 */
function processInbox() {
  const processedLabel = getOrCreateLabel_(CONFIG.LABELS.processed);
  const threads = findSiteThreads_();

  Logger.log(threads.length + ' fil(s) candidat(s) trouvé(s).');
  let handled = 0;

  for (const thread of threads) {
    if (handled >= CONFIG.SITE.maxThreadsPerRun) break;

    // Anti-doublon : déjà traité ? on saute.
    const labels = thread.getLabels().map(function (l) { return l.getName(); });
    if (labels.indexOf(CONFIG.LABELS.processed) !== -1) continue;

    try {
      handleThread_(thread, processedLabel);
      handled++;
    } catch (err) {
      Logger.log('Erreur sur un fil : ' + err + '\n' + (err.stack || ''));
      // On NE pose PAS le label "Traité" en cas d'erreur -> on réessaiera.
    }
  }

  Logger.log(handled + ' fil(s) traité(s).');
}

/**
 * Traite un fil : classe, prépare la réponse, crée le brouillon, pose les labels.
 */
function handleThread_(thread, processedLabel) {
  const msg = thread.getMessages()[0]; // 1er message = la demande initiale.
  const subject = msg.getSubject() || '';
  const body = msg.getPlainBody() || '';

  // 1) Catégorie
  const category = classifyMessage(subject, body);
  Logger.log('Catégorie = ' + category + ' | objet = ' + subject);

  // 2) Contexte pour le modèle
  const ctx = {
    name: guessFirstName_(body, msg.getFrom()),
    slots: '',
  };

  // 3) Si rendez-vous -> créneaux Calendar
  if (category === 'appointment') {
    try {
      const slots = findFreeSlots();
      ctx.slots = slots.length ? formatSlots(slots) : '';
    } catch (err) {
      Logger.log('Calendar KO : ' + err); // on continue sans créneaux
    }
  }

  // 4) Rédaction
  const replyBody = buildDraftBody(category, ctx);

  // 5) Brouillon (ou envoi si configuré ainsi)
  if (CONFIG.SEND_MODE === 'send') {
    thread.reply(replyBody);                 // ⚠️ envoi réel
    Logger.log('✉️ Mail ENVOYÉ (mode send).');
  } else {
    thread.createDraftReply(replyBody);      // ✅ brouillon, rien n'est envoyé
    Logger.log('📝 Brouillon créé (mode draft).');
  }

  // 6) Labels (catégorie + traité)
  const catLabelName = CONFIG.LABELS.byCategory[category];
  if (catLabelName) thread.addLabel(getOrCreateLabel_(catLabelName));
  thread.addLabel(processedLabel);
}

/**
 * Construit la requête Gmail et renvoie les fils correspondant au site.
 */
function findSiteThreads_() {
  const parts = [];

  // Filtre par expéditeur(s)
  CONFIG.SITE.fromAddresses.forEach(function (addr) {
    if (addr) parts.push('from:(' + addr + ')');
  });

  // Filtre par mots de l'objet
  CONFIG.SITE.subjectContains.forEach(function (kw) {
    if (kw) parts.push('subject:(' + JSON.stringify(kw) + ')');
  });

  if (parts.length === 0) {
    throw new Error(
      'Aucun critère de filtrage défini. Renseigne CONFIG.SITE.fromAddresses ' +
      'et/ou CONFIG.SITE.subjectContains dans Config.gs.'
    );
  }

  // (critère1 OU critère2 ...) ET non déjà traité ET récent.
  const query =
    '(' + parts.join(' OR ') + ') ' +
    '-label:"' + CONFIG.LABELS.processed + '" ' +
    'newer_than:30d';

  Logger.log('Requête Gmail : ' + query);
  return GmailApp.search(query, 0, 50);
}

/**
 * Récupère un label par son nom, le crée s'il n'existe pas.
 * Gère les labels imbriqués "Auto/Rendez-vous".
 */
function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

/**
 * Devine le prénom du contact : d'abord dans le corps (formulaires du type
 * "Name: Jane"), sinon dans l'adresse "De :".
 */
function guessFirstName_(body, from) {
  // Cherche un champ "Name / Nom / Prénom : ..." typique des formulaires.
  const m = body.match(/(?:name|nom|prénom|prenom|full name)\s*[:\-]\s*([^\n\r,]+)/i);
  if (m && m[1]) {
    const first = m[1].trim().split(/\s+/)[0];
    if (first && first.length <= 30) return capitalize_(first);
  }

  // Sinon : "Jane Doe <jane@x.com>"
  const nameMatch = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (nameMatch && nameMatch[1].trim()) {
    return capitalize_(nameMatch[1].trim().split(/\s+/)[0]);
  }

  return ''; // -> le modèle utilisera "there"
}

function capitalize_(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ============================================================================
 *  OUTILS DE TEST / MAINTENANCE — à lancer à la main depuis l'éditeur.
 * ========================================================================== */

/**
 * 🧪 TEST À BLANC : montre ce que le script FERAIT, sans rien créer ni envoyer.
 * Lance cette fonction en premier pour vérifier le filtrage et la classification.
 */
function dryRun() {
  const threads = findSiteThreads_();
  Logger.log('=== TEST À BLANC — aucun brouillon créé, aucun mail envoyé ===');
  Logger.log(threads.length + ' fil(s) seraient examinés.');

  threads.slice(0, CONFIG.SITE.maxThreadsPerRun).forEach(function (thread, i) {
    const msg = thread.getMessages()[0];
    const category = classifyMessage(msg.getSubject(), msg.getPlainBody());
    Logger.log((i + 1) + ') [' + category + '] ' + msg.getSubject() +
               '  —  de ' + msg.getFrom());
  });
}

/**
 * 🧪 Vérifie l'accès à l'agenda et affiche les créneaux qui seraient proposés.
 */
function testCalendar() {
  const slots = findFreeSlots();
  Logger.log('Créneaux proposés :\n' + (formatSlots(slots) || '(aucun)'));
}

/**
 * 🛠️ Met en place le déclencheur automatique (toutes les 15 min).
 * À lancer UNE SEULE FOIS. Relancer ne crée pas de doublon.
 */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processInbox') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processInbox')
    .timeBased()
    .everyMinutes(15)
    .create();
  Logger.log('✅ Déclencheur installé : processInbox toutes les 15 minutes.');
}

/**
 * 🧹 Supprime le déclencheur automatique (stoppe l'automatisation).
 */
function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processInbox') ScriptApp.deleteTrigger(t);
  });
  Logger.log('🛑 Déclencheur supprimé. L\'automatisation est arrêtée.');
}
