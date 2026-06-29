/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   ELYSIAN PARIS — Assistant de réponse aux e-mails                   ║
 * ║                                                                       ║
 * ║   👉 TU choisis les mails à traiter en leur mettant l'étiquette       ║
 * ║      "Répondre-IA" dans Gmail. Le script prépare un BROUILLON.        ║
 * ║                                                                       ║
 * ║   🔒 Il NE PEUT PAS envoyer de mail tout seul. Il crée des            ║
 * ║      BROUILLONS. Tu les relis et tu envoies à la main.               ║
 * ║                                                                       ║
 * ║   ✅ Comme c'est TOI qui mets l'étiquette, aucun risque de répondre   ║
 * ║      par erreur à ClassPass, Stripe, Google ou aux invitations.      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ════════════════════════════════════════════════════════════════════════
//  ⬇️  ZONE À REMPLIR  —  C'est la SEULE partie à modifier.
// ════════════════════════════════════════════════════════════════════════

const REGLAGES = {

  // 1) L'étiquette que TU poses dans Gmail sur les mails à traiter.
  //    (Le script la crée tout seul la 1re fois. Ne la change pas après.)
  labelARepondre: 'Répondre-IA',

  // 2) Ton agenda Google (pour proposer des créneaux de rendez-vous)
  heureDebut: 9,      // tu ouvres à 9h
  heureFin: 18,       // tu fermes à 18h
  joursTravailles: [1, 2, 3, 4, 5, 6],  // 1=lundi ... 7=dimanche
  dureeRendezVous: 60,                   // minutes

  // 3) Ta signature (le numéro WhatsApp est déjà dedans)
  signature: [
    'Warm regards,',
    'Stéphanie',
    'Elysian Paris — Lymphatic Drainage',
    'Kensington, London',
    'WhatsApp: 07742 091557 (+44 7742 091557)',
    'www.elysian-institute.com',
  ].join('\n'),

  // 4) Envoi ? Laisse 'brouillon' (sûr). Mets 'envoi' pour envoyer tout seul.
  mode: 'brouillon',
};

// ════════════════════════════════════════════════════════════════════════
//  ⬆️  FIN de la zone à remplir. NE TOUCHE PAS au reste (sauf les modèles
//      de réponse plus bas, si tu veux changer les textes).
// ════════════════════════════════════════════════════════════════════════


/* ──────────────────────────────────────────────────────────────────────
 *  ▶️ FONCTIONS À LANCER (depuis le menu en haut de script.google.com)
 * ────────────────────────────────────────────────────────────────────── */

// 🏷️ À LANCER 1 FOIS — crée l'étiquette "Répondre-IA" dans ton Gmail.
function _0_creer_letiquette() {
  ensureLabel_(REGLAGES.labelARepondre);
  Logger.log('✅ Étiquette "' + REGLAGES.labelARepondre + '" prête dans Gmail. '
    + 'Mets-la sur les mails à traiter, puis lance _3_creer_les_brouillons.');
}

// 🧪 TEST — Montre les mails étiquetés. Ne crée RIEN, n'envoie RIEN.
function _1_tester_detection() {
  const fils = trouverMails_();
  Logger.log('=== TEST — rien n\'est créé ni envoyé ===');
  Logger.log(fils.length + ' mail(s) avec l\'étiquette "' + REGLAGES.labelARepondre + '".');
  fils.forEach(function (fil, i) {
    const m = dernierMessage_(fil);
    Logger.log((i + 1) + ') [' + classer_(m.getSubject(), m.getPlainBody()) +
               '] ' + m.getSubject() + '  — de ' + m.getFrom());
  });
}

// 🧪 TEST — Montre les créneaux libres qui seraient proposés.
function _2_tester_agenda() {
  Logger.log('Créneaux proposés :\n' + (formaterCreneaux_(creneauxLibres_()) || '(aucun)'));
}

// ✅ Crée les BROUILLONS de réponse pour les mails étiquetés.
function _3_creer_les_brouillons() {
  traiterBoite_();
}

// 🔁 Lance l'automatisation (toutes les 15 min). À faire UNE fois.
function _4_activer_automatique() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'traiterBoite_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('traiterBoite_').timeBased().everyMinutes(15).create();
  Logger.log('✅ C\'est activé. Le script vérifie tout seul toutes les 15 min.');
}

// 🛑 Pour ARRÊTER l'automatisation.
function _5_arreter_automatique() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'traiterBoite_') ScriptApp.deleteTrigger(t);
  });
  Logger.log('🛑 Automatisation arrêtée.');
}


/* ──────────────────────────────────────────────────────────────────────
 *  MOTEUR  (tu peux ignorer cette partie)
 * ────────────────────────────────────────────────────────────────────── */

const LABEL_TRAITE = 'Auto/Traité';
const LABELS_CAT = {
  rendezvous:    'Auto/Rendez-vous',
  prix:          'Auto/Prix',
  services:      'Auto/Services',
  collaboration: 'Auto/Collaboration',
  autre:         'Auto/Autre',
};

function traiterBoite_() {
  const labelTraite = label_(LABEL_TRAITE);
  const labelTodo = label_(REGLAGES.labelARepondre);
  const fils = trouverMails_();
  Logger.log(fils.length + ' mail(s) à traiter.');

  fils.slice(0, 15).forEach(function (fil) {
    try {
      const m = dernierMessage_(fil);
      const cat = classer_(m.getSubject(), m.getPlainBody());
      const ctx = { nom: prenom_(m.getPlainBody(), m.getFrom()), creneaux: '' };

      if (cat === 'rendezvous') {
        try { ctx.creneaux = formaterCreneaux_(creneauxLibres_()); }
        catch (e) { Logger.log('Agenda KO : ' + e); }
      }

      const texte = modele_(cat, ctx);
      if (REGLAGES.mode === 'envoi') { fil.reply(texte); Logger.log('✉️ Envoyé : ' + cat); }
      else { fil.createDraftReply(texte); Logger.log('📝 Brouillon créé : ' + cat); }

      if (LABELS_CAT[cat]) fil.addLabel(label_(LABELS_CAT[cat]));
      fil.addLabel(labelTraite);
      fil.removeLabel(labelTodo);   // retire "Répondre-IA" -> c'est fait
    } catch (err) {
      Logger.log('Erreur : ' + err);
    }
  });
}

function trouverMails_() {
  ensureLabel_(REGLAGES.labelARepondre);
  const q = 'label:"' + REGLAGES.labelARepondre + '" -label:"' + LABEL_TRAITE + '"';
  Logger.log('Recherche Gmail : ' + q);
  return GmailApp.search(q, 0, 50);
}

// Dernier message du fil = le message le plus récent (la demande du client).
function dernierMessage_(fil) {
  const msgs = fil.getMessages();
  return msgs[msgs.length - 1];
}

function classer_(objet, corps) {
  const t = ' ' + ((objet || '') + ' ' + (corps || '')).toLowerCase() + ' ';
  const regles = {
    rendezvous: ['appointment','book','booking','availability','slot','session',
      'consultation','rendez-vous','rdv','disponibilit','créneau','creneau','réserver'],
    prix: ['price','pricing','cost','how much','fee','rate','quote','tarif','prix','combien','devis'],
    services: ['service','treatment','lymphatic','drainage','massage','contouring',
      'cavitation','method','post-surgery','prenatal','soin','traitement','méthode'],
    collaboration: ['collaboration','partnership','partner','press','media','influencer',
      'brand','b2b','partenariat','collaborer','presse'],
  };
  let best = 'autre', score = 0;
  Object.keys(regles).forEach(function (c) {
    let s = 0;
    regles[c].forEach(function (k) { if (t.indexOf(k) !== -1) s++; });
    if (s > score) { score = s; best = c; }
  });
  return best;
}

function creneauxLibres_() {
  const cal = CalendarApp.getDefaultCalendar();
  const dureeMs = REGLAGES.dureeRendezVous * 60000;
  const margeMs = 15 * 60000;
  const res = [];
  const now = new Date();

  for (let j = 1; j <= 14 && res.length < 3; j++) {
    const jour = new Date(now); jour.setDate(jour.getDate() + j);
    const iso = jour.getDay() === 0 ? 7 : jour.getDay();
    if (REGLAGES.joursTravailles.indexOf(iso) === -1) continue;

    const debut = new Date(jour); debut.setHours(REGLAGES.heureDebut, 0, 0, 0);
    const fin = new Date(jour); fin.setHours(REGLAGES.heureFin, 0, 0, 0);

    const occupes = cal.getEvents(debut, fin)
      .filter(function (e) { return !e.isAllDayEvent(); })
      .map(function (e) {
        return { d: e.getStartTime().getTime() - margeMs, f: e.getEndTime().getTime() + margeMs };
      });

    for (let t = debut.getTime(); t + dureeMs <= fin.getTime(); t += 30 * 60000) {
      const chevauche = occupes.some(function (o) { return t < o.f && t + dureeMs > o.d; });
      if (!chevauche) { res.push({ start: new Date(t), end: new Date(t + dureeMs) }); break; }
    }
  }
  return res;
}

function formaterCreneaux_(creneaux) {
  return creneaux.map(function (s) {
    const j = Utilities.formatDate(s.start, 'Europe/London', 'EEEE d MMMM');
    const a = Utilities.formatDate(s.start, 'Europe/London', 'HH:mm');
    const b = Utilities.formatDate(s.end, 'Europe/London', 'HH:mm');
    return '• ' + j + ', ' + a + '–' + b;
  }).join('\n');
}

function ensureLabel_(nom) { return label_(nom); }

function label_(nom) {
  return GmailApp.getUserLabelByName(nom) || GmailApp.createLabel(nom);
}

function prenom_(corps, from) {
  const m = corps.match(/(?:name|nom|prénom|prenom)\s*[:\-]\s*([^\n\r,]+)/i);
  if (m && m[1]) { const p = m[1].trim().split(/\s+/)[0]; if (p && p.length <= 30) return cap_(p); }
  const n = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (n && n[1].trim()) return cap_(n[1].trim().split(/\s+/)[0]);
  return '';
}
function cap_(s) { return s.charAt(0).toUpperCase() + s.slice(1); }


/* ──────────────────────────────────────────────────────────────────────
 *  MODÈLES DE RÉPONSE  —  change librement les textes entre guillemets.
 *  Les tarifs et descriptions sont déjà pré-remplis (mets-les à jour si besoin).
 * ────────────────────────────────────────────────────────────────────── */

function modele_(cat, ctx) {
  const nom = ctx.nom || 'there';
  const creneaux = ctx.creneaux || '';
  let corps;

  if (cat === 'rendezvous') {
    corps = 'Dear ' + nom + ',\n\nThank you so much for reaching out to Elysian Paris. '
      + 'I would be delighted to welcome you for a session.\n\n'
      + (creneaux
          ? 'Here are a few times I currently have available:\n\n' + creneaux
            + '\n\nPlease let me know which one suits you best and I will confirm right away.'
          : 'Could you let me know your general availability over the coming days?')
      + '\n\nIf you have had a recent surgery or any specific condition, feel free to mention it.';
  } else if (cat === 'prix') {
    corps = 'Dear ' + nom + ',\n\nThank you for your interest in Elysian Paris. '
      + 'Here is our current treatment menu:\n\n'
      + '• Lymphatic Drainage – 1 Zone (60 min): £120\n'
      + '• Lymphatic Drainage – 2 Zones (90 min): £240\n'
      + '• Maderotherapy (60 min): £80\n'
      + '• Post-Operative Care (60 min): £80\n'
      + '• Prenatal & Postnatal Massage (45–60 min): £80\n'
      + '• Cavitation Fusion (90 min): £150\n\n'
      + 'If you let me know which treatment you have in mind, I can give you a precise quote.';
  } else if (cat === 'services') {
    corps = 'Dear ' + nom + ',\n\nThank you for your message. At Elysian Paris we specialise in '
      + 'The Elysian Paris Method® — manual lymphatic drainage and bespoke body contouring, '
      + 'including post-surgery and prenatal care.\n\nOur treatments:\n\n'
      + '• Lymphatic Drainage — reduces swelling and restores balance (1 or 2 zones).\n'
      + '• Maderotherapy — sculpting wood-tool massage to refine body contour.\n'
      + '• Post-Operative Care — gentle drainage to support recovery after surgery.\n'
      + '• Prenatal & Postnatal Massage — relieves tension and swelling during and after pregnancy.\n'
      + '• Cavitation Fusion — non-invasive body contouring with lymphatic drainage.\n\n'
      + 'I would be glad to help you choose the treatment best suited to your needs.';
  } else if (cat === 'collaboration') {
    corps = 'Dear ' + nom + ',\n\nThank you very much for getting in touch and for your interest '
      + 'in collaborating with Elysian Paris.\n\nCould you share a few details about the project, '
      + 'the timeline and what a partnership might look like on your side?';
  } else {
    corps = 'Dear ' + nom + ',\n\nThank you for your message. I have received your enquiry and '
      + 'will get back to you very shortly with a personal reply.\n\n'
      + 'In the meantime, please feel free to share any further details that would help me assist you.';
  }

  return corps + '\n\n' + REGLAGES.signature;
}
