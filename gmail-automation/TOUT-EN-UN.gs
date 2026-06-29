/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   ELYSIAN PARIS — Tri automatique des e-mails du site                ║
 * ║   👉 UN SEUL FICHIER. Copie-colle TOUT ça dans script.google.com.    ║
 * ║   Puis modifie UNIQUEMENT la zone "À REMPLIR" juste en dessous.       ║
 * ║                                                                       ║
 * ║   🔒 Ce script NE PEUT PAS envoyer de mail tout seul.                 ║
 * ║      Il crée des BROUILLONS. Tu les relis et tu envoies à la main.   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ════════════════════════════════════════════════════════════════════════
//  ⬇️  ZONE À REMPLIR  —  C'est la SEULE partie à modifier.
// ════════════════════════════════════════════════════════════════════════

const REGLAGES = {

  // 1) Comment reconnaître les mails de ton formulaire ?
  //    Ouvre un VRAI mail reçu via ton site, regarde l'objet, et mets ici
  //    un ou plusieurs mots qui apparaissent dans cet objet.
  motsDansObjet: ['contact form', 'formulaire', 'enquiry', 'website'],

  //    (Optionnel) L'adresse qui envoie ces mails (le "De :").
  //    Laisse '' si tu ne sais pas — les mots de l'objet suffisent.
  adresseExpediteur: '',

  // 2) Ton agenda Google
  heureDebut: 9,      // tu ouvres à 9h
  heureFin: 18,       // tu fermes à 18h
  joursTravailles: [1, 2, 3, 4, 5, 6],  // 1=lundi ... 7=dimanche
  dureeRendezVous: 60,                   // minutes

  // 3) Ta signature (le numéro WhatsApp est déjà dedans)
  signature: [
    'Warm regards,',
    'Stéphanie',
    'Elysian Paris — Manual Lymphatic Drainage',
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

// 🧪 TEST 1 — Montre les mails détectés. Ne crée RIEN, n'envoie RIEN.
function _1_tester_detection() {
  const fils = trouverMails_();
  Logger.log('=== TEST — rien n\'est créé ni envoyé ===');
  Logger.log(fils.length + ' mail(s) détecté(s).');
  fils.forEach(function (fil, i) {
    const m = fil.getMessages()[0];
    Logger.log((i + 1) + ') [' + classer_(m.getSubject(), m.getPlainBody()) +
               '] ' + m.getSubject() + '  — de ' + m.getFrom());
  });
}

// 🧪 TEST 2 — Montre les créneaux libres qui seraient proposés.
function _2_tester_agenda() {
  Logger.log('Créneaux proposés :\n' + (formaterCreneaux_(creneauxLibres_()) || '(aucun)'));
}

// ✅ ÉTAPE 3 — Crée les BROUILLONS de réponse + pose les labels.
function _3_creer_les_brouillons() {
  traiterBoite_();
}

// 🔁 ÉTAPE 4 — Lance l'automatisation (toutes les 15 min). À faire UNE fois.
function _4_activer_automatique() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'traiterBoite_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('traiterBoite_').timeBased().everyMinutes(15).create();
  Logger.log('✅ C\'est activé. Le script tournera tout seul toutes les 15 min.');
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
  const fils = trouverMails_();
  Logger.log(fils.length + ' mail(s) à examiner.');

  fils.slice(0, 10).forEach(function (fil) {
    const noms = fil.getLabels().map(function (l) { return l.getName(); });
    if (noms.indexOf(LABEL_TRAITE) !== -1) return; // déjà traité

    try {
      const m = fil.getMessages()[0];
      const cat = classer_(m.getSubject(), m.getPlainBody());
      const ctx = { nom: prenom_(m.getPlainBody(), m.getFrom()), creneaux: '' };

      if (cat === 'rendezvous') {
        try { ctx.creneaux = formaterCreneaux_(creneauxLibres_()); }
        catch (e) { Logger.log('Agenda KO : ' + e); }
      }

      const texte = modele_(cat, ctx);
      if (REGLAGES.mode === 'envoi') { fil.reply(texte); Logger.log('✉️ Envoyé.'); }
      else { fil.createDraftReply(texte); Logger.log('📝 Brouillon créé : ' + cat); }

      if (LABELS_CAT[cat]) fil.addLabel(label_(LABELS_CAT[cat]));
      fil.addLabel(labelTraite);
    } catch (err) {
      Logger.log('Erreur : ' + err);
    }
  });
}

function trouverMails_() {
  const crit = [];
  if (REGLAGES.adresseExpediteur) crit.push('from:(' + REGLAGES.adresseExpediteur + ')');
  REGLAGES.motsDansObjet.forEach(function (mot) {
    if (mot) crit.push('subject:(' + JSON.stringify(mot) + ')');
  });
  if (!crit.length) throw new Error('Remplis "motsDansObjet" dans les REGLAGES.');
  const q = '(' + crit.join(' OR ') + ') -label:"' + LABEL_TRAITE + '" newer_than:30d';
  Logger.log('Recherche Gmail : ' + q);
  return GmailApp.search(q, 0, 50);
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
 *  Les [À COMPLÉTER] sont à remplacer par TES infos (tarifs, soins...).
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
      + 'I would be happy to share details of our treatments and pricing.\n\n'
      + '[À COMPLÉTER : ta grille tarifaire ou un lien vers la page tarifs.]\n\n'
      + 'If you let me know which treatment you have in mind, I can give you a precise quote.';
  } else if (cat === 'services') {
    corps = 'Dear ' + nom + ',\n\nThank you for your message. At Elysian Paris we specialise in '
      + 'The Elysian Paris Method® — manual lymphatic drainage and bespoke body contouring, '
      + 'including post-surgery and prenatal care.\n\n'
      + '[À COMPLÉTER : décris le soin qui correspond à sa demande.]\n\n'
      + 'I would be glad to help you choose the treatment best suited to your needs.';
  } else if (cat === 'collaboration') {
    corps = 'Dear ' + nom + ',\n\nThank you very much for getting in touch and for your interest '
      + 'in collaborating with Elysian Paris.\n\nCould you share a few details about the project, '
      + 'the timeline and what a partnership might look like on your side?';
  } else {
    corps = 'Dear ' + nom + ',\n\nThank you for your message. I have received your enquiry and '
      + 'will get back to you very shortly with a personal reply.\n\n'
      + '[À COMPLÉTER : réponds au point précis soulevé par la personne.]';
  }

  return corps + '\n\n' + REGLAGES.signature;
}
