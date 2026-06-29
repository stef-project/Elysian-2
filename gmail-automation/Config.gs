/**
 * ============================================================================
 *  CONFIG.gs  —  Tous les réglages au même endroit.
 *  C'est le SEUL fichier que tu auras normalement besoin de modifier.
 * ============================================================================
 *
 *  Clinique : Elysian Paris (drainage lymphatique, Kensington, Londres)
 *
 *  ⚠️  SÉCURITÉ : ce script NE PEUT PAS envoyer d'e-mail. Il crée seulement
 *      des BROUILLONS. C'est volontaire. Ne change pas ce comportement.
 */

const CONFIG = {

  // --------------------------------------------------------------------------
  // 1) COMMENT RECONNAÎTRE LES MAILS QUI VIENNENT DE TON SITE
  // --------------------------------------------------------------------------
  // Le script ne traite QUE les mails qui correspondent à l'un de ces critères.
  // Tu peux remplir l'un ou l'autre (ou les deux). Mets ce qui colle à TON site.
  //
  // Astuce pour trouver la bonne valeur :
  //   - Ouvre un vrai mail reçu via ton formulaire.
  //   - Regarde l'adresse "De :" (ex: no-reply@ton-hebergeur.com, wordpress@...)
  //   - Regarde l'objet (ex: "Nouveau message du formulaire de contact")
  SITE: {
    // Adresses e-mail qui envoient les messages du formulaire (insensible à la casse).
    // Laisse [] si tu préfères filtrer uniquement par objet.
    fromAddresses: [
      // 'no-reply@elysian-institute.com',
      // 'wordpress@elysian-institute.com',
    ],

    // Mots qui apparaissent dans l'OBJET des mails du formulaire.
    // Le mail est retenu si l'objet contient AU MOINS un de ces mots.
    subjectContains: [
      'contact form',
      'formulaire',
      'new enquiry',
      'nouvelle demande',
      'website',
      'site web',
    ],

    // Filet de sécurité : nombre max de fils traités à chaque exécution.
    // Évite de tout traiter d'un coup si tu as un gros retard de mails.
    maxThreadsPerRun: 10,
  },

  // --------------------------------------------------------------------------
  // 2) LABELS GMAIL (créés automatiquement s'ils n'existent pas)
  // --------------------------------------------------------------------------
  LABELS: {
    // Label posé sur TOUT mail déjà traité (anti-doublon). Ne pas le retirer.
    processed: 'Auto/Traité',

    // Un label par catégorie.
    byCategory: {
      appointment:   'Auto/Rendez-vous',
      pricing:       'Auto/Prix',
      services:      'Auto/Services',
      collaboration: 'Auto/Collaboration',
      other:         'Auto/Autre',
    },
  },

  // --------------------------------------------------------------------------
  // 3) DISPONIBILITÉS GOOGLE CALENDAR
  // --------------------------------------------------------------------------
  CALENDAR: {
    // 'primary' = ton agenda principal. Ou colle l'ID d'un agenda spécifique
    // (Paramètres de l'agenda > "Intégrer l'agenda" > ID de l'agenda).
    calendarId: 'primary',

    // Fuseau horaire pour l'affichage des créneaux (Londres).
    timezone: 'Europe/London',

    // Durée d'un rendez-vous proposé, en minutes.
    appointmentMinutes: 60,

    // Heures d'ouverture (format 24h). 9 -> 9h00, 18 -> 18h00.
    workdayStartHour: 9,
    workdayEndHour: 18,

    // Jours travaillés : 1 = lundi ... 7 = dimanche.
    workdays: [1, 2, 3, 4, 5, 6],

    // On commence à proposer des créneaux à partir de J+X (1 = dès demain).
    startInDays: 1,

    // On regarde les disponibilités sur cette fenêtre (en jours).
    lookaheadDays: 14,

    // Combien de créneaux proposer dans le brouillon (2 ou 3 recommandé).
    slotsToPropose: 3,

    // Marge minimale entre deux rendez-vous (minutes), avant et après.
    bufferMinutes: 15,
  },

  // --------------------------------------------------------------------------
  // 4) SIGNATURE & LANGUE DES BROUILLONS
  // --------------------------------------------------------------------------
  // Le site de la clinique est en anglais : les modèles ci-dessous (dans
  // Templates.gs) sont en anglais. Tu peux tout réécrire en français si tu veux.
  SIGNATURE: [
    'Warm regards,',
    'Stéphanie',
    'Elysian Paris — Manual Lymphatic Drainage',
    'Kensington, London',
    'WhatsApp: 07742 091557 (+44 7742 091557)',
    'www.elysian-institute.com',
  ].join('\n'),

  // Numéro WhatsApp ajouté automatiquement à CHAQUE brouillon (toujours visible).
  WHATSAPP: '07742 091557 (+44 7742 091557)',

  // --------------------------------------------------------------------------
  //  MODE D'ENVOI  —  laisse 'draft' (recommandé pour une clinique).
  // --------------------------------------------------------------------------
  //   'draft' = crée un BROUILLON, tu relis puis tu envoies à la main (SÛR).
  //   'send'  = envoie AUTOMATIQUEMENT le mail (⚠️ aucune relecture possible).
  // Pour passer en envoi auto un jour : remplace 'draft' par 'send'.
  SEND_MODE: 'draft',

  // --------------------------------------------------------------------------
  // 5) (OPTIONNEL) CLASSIFICATION PAR IA — Google Gemini
  // --------------------------------------------------------------------------
  // Par défaut le script classe les mails avec des mots-clés (gratuit, instantané,
  // aucune clé requise). Si tu veux une vraie analyse IA, mets useGeminiAI = true
  // et colle une clé API Gemini (voir le README, section "Option IA").
  AI: {
    useGeminiAI: false,
    geminiApiKey: '',          // ⚠️ Ne JAMAIS committer une vraie clé dans Git.
    geminiModel: 'gemini-2.0-flash',
  },
};
