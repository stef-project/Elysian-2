/**
 * ============================================================================
 *  TEMPLATES.gs  —  Modèles de réponse, un par catégorie.
 * ============================================================================
 *
 *  Tout est en anglais (langue de la clinique). Réécris librement.
 *  {{name}}  -> prénom du contact (deviné depuis le mail)
 *  {{slots}} -> liste des créneaux (catégorie "appointment" uniquement)
 */

// Grille tarifaire (reprise du site). Mets à jour ici si tes prix changent.
const PRICE_LIST = [
  '• Lymphatic Drainage – 1 Zone (60 min): £120',
  '• Lymphatic Drainage – 2 Zones (90 min): £240',
  '• Maderotherapy (60 min): £80',
  '• Post-Operative Care (60 min): £80',
  '• Prenatal & Postnatal Massage (45–60 min): £80',
  '• Cavitation Fusion (90 min): £150',
].join('\n');

// Courtes descriptions des soins.
const SERVICES_LIST = [
  '• Lymphatic Drainage — stimulates the lymphatic system, reduces swelling and restores balance (1 or 2 zones).',
  '• Maderotherapy — sculpting wood-tool massage that boosts circulation and refines body contour.',
  '• Post-Operative Care — gentle, specialist drainage to support recovery and reduce swelling after surgery.',
  '• Prenatal & Postnatal Massage — tailored treatment to relieve tension and swelling during and after pregnancy.',
  '• Cavitation Fusion — non-invasive body contouring combining ultrasound cavitation with lymphatic drainage.',
].join('\n');

function buildDraftBody(category, ctx) {
  const name = ctx.name || 'there';
  const slots = ctx.slots || '';

  let body;

  switch (category) {

    case 'appointment':
      body =
        'Dear ' + name + ',\n\n' +
        'Thank you so much for reaching out to Elysian Paris. ' +
        'I would be delighted to welcome you for a session.\n\n' +
        (slots
          ? 'Here are a few times I currently have available:\n\n' + slots +
            '\n\nPlease let me know which one suits you best, and I will ' +
            'confirm the booking straight away.'
          : 'Could you let me know your general availability over the coming ' +
            'days? I will then propose a few times that work for you.') +
        '\n\nIf you have had a recent surgery or any specific condition, feel ' +
        'free to mention it so I can tailor the session accordingly.';
      break;

    case 'pricing':
      body =
        'Dear ' + name + ',\n\n' +
        'Thank you for your interest in Elysian Paris. ' +
        'Here is our current treatment menu:\n\n' +
        PRICE_LIST + '\n\n' +
        'If you let me know which treatment you have in mind, I can give you a ' +
        'precise quote and recommend the most suitable option.';
      break;

    case 'services':
      body =
        'Dear ' + name + ',\n\n' +
        'Thank you for your message. At Elysian Paris we specialise in The ' +
        'Elysian Paris Method® — manual lymphatic drainage and bespoke body ' +
        'contouring, including post-surgery and prenatal care.\n\n' +
        'Our treatments:\n\n' + SERVICES_LIST + '\n\n' +
        'I would be glad to answer any further questions and help you choose ' +
        'the treatment best suited to your needs.';
      break;

    case 'collaboration':
      body =
        'Dear ' + name + ',\n\n' +
        'Thank you very much for getting in touch and for your interest in ' +
        'collaborating with Elysian Paris.\n\n' +
        'I would love to hear more about what you have in mind. Could you share ' +
        'a few details about the project, the timeline and what a partnership ' +
        'might look like on your side?\n\n' +
        'I will then come back to you with the best way forward.';
      break;

    default: // 'other'
      body =
        'Dear ' + name + ',\n\n' +
        'Thank you for your message — it is much appreciated. ' +
        'I have received your enquiry and will get back to you very shortly ' +
        'with a personal reply.\n\n' +
        'In the meantime, please feel free to share any further details that ' +
        'would help me assist you.';
      break;
  }

  return body + '\n\n' + CONFIG.SIGNATURE;
}
