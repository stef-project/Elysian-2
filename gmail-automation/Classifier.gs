/**
 * ============================================================================
 *  CLASSIFIER.gs  —  Détermine la catégorie d'une demande.
 * ============================================================================
 *
 *  Deux modes :
 *   - Par défaut : règles par mots-clés (gratuit, instantané, aucune clé).
 *   - Optionnel  : Google Gemini (mettre CONFIG.AI.useGeminiAI = true).
 *
 *  Catégories possibles :
 *   'appointment' | 'pricing' | 'services' | 'collaboration' | 'other'
 */

const CATEGORIES = ['appointment', 'pricing', 'services', 'collaboration', 'other'];

/**
 * Point d'entrée : renvoie la catégorie d'un texte (objet + corps du mail).
 */
function classifyMessage(subject, body) {
  const text = ((subject || '') + '\n' + (body || ''));

  if (CONFIG.AI.useGeminiAI && CONFIG.AI.geminiApiKey) {
    try {
      return classifyWithGemini_(text);
    } catch (err) {
      // Si l'IA échoue (quota, réseau...), on retombe sur les mots-clés.
      Logger.log('Gemini KO, fallback mots-clés : ' + err);
    }
  }
  return classifyWithKeywords_(text);
}

/**
 * Classification par mots-clés. Robuste, FR + EN.
 * On compte les correspondances par catégorie et on prend la meilleure.
 */
function classifyWithKeywords_(text) {
  const t = ' ' + text.toLowerCase() + ' ';

  const RULES = {
    appointment: [
      'appointment', 'book', 'booking', 'reschedule', 'availability',
      'available', 'slot', 'session', 'consultation', 'when can',
      'rendez-vous', 'rdv', 'disponibilit', 'créneau', 'creneau',
      'réserver', 'reserver', 'prendre rendez',
    ],
    pricing: [
      'price', 'prices', 'pricing', 'cost', 'how much', 'fee', 'fees',
      'rate', 'rates', 'quote', 'package', 'tarif', 'tarifs', 'prix',
      'combien', 'coût', 'cout', 'devis',
    ],
    services: [
      'service', 'treatment', 'lymphatic', 'drainage', 'massage',
      'contouring', 'cavitation', 'method', 'procedure', 'do you offer',
      'post-surgery', 'prenatal', 'prestation', 'soin', 'soins',
      'traitement', 'méthode', 'methode', 'proposez-vous',
    ],
    collaboration: [
      'collaboration', 'collaborate', 'partnership', 'partner', 'press',
      'media', 'influencer', 'sponsor', 'brand', 'wholesale', 'b2b',
      'business proposal', 'work together', 'partenariat', 'collaborer',
      'presse', 'média', 'media', 'sponsoring', 'proposition commerciale',
    ],
  };

  let best = 'other';
  let bestScore = 0;

  for (const category of Object.keys(RULES)) {
    let score = 0;
    for (const kw of RULES[category]) {
      if (t.indexOf(kw) !== -1) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }
  return best;
}

/**
 * Classification via Google Gemini (optionnelle).
 * Renvoie une des CATEGORIES. Lève une erreur si la réponse est inattendue.
 */
function classifyWithGemini_(text) {
  const prompt =
    'You are an email triage assistant for a lymphatic drainage clinic.\n' +
    'Classify the enquiry into EXACTLY ONE of these labels and reply with the ' +
    'label only, no punctuation:\n' +
    'appointment, pricing, services, collaboration, other.\n\n' +
    'Email:\n"""\n' + text.slice(0, 4000) + '\n"""';

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(CONFIG.AI.geminiModel) + ':generateContent?key=' +
    encodeURIComponent(CONFIG.AI.geminiApiKey);

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 10 },
  };

  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (resp.getResponseCode() !== 200) {
    throw new Error('Gemini HTTP ' + resp.getResponseCode() + ': ' + resp.getContentText());
  }

  const data = JSON.parse(resp.getContentText());
  const raw = ((((data.candidates || [])[0] || {}).content || {}).parts || [{}])[0].text || '';
  const label = raw.trim().toLowerCase().replace(/[^a-z]/g, '');

  if (CATEGORIES.indexOf(label) === -1) {
    throw new Error('Réponse IA inattendue : "' + raw + '"');
  }
  return label;
}
