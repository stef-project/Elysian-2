/**
 * ============================================================================
 *  TEMPLATES.gs  —  Modèles de réponse, un par catégorie.
 * ============================================================================
 *
 *  Tout est en anglais (langue de la clinique). Réécris librement.
 *  {{name}}  -> prénom du contact (deviné depuis le mail)
 *  {{slots}} -> liste des créneaux (catégorie "appointment" uniquement)
 */

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
        'I would be happy to share details of our treatments and pricing.\n\n' +
        '[À COMPLÉTER : insère ici ta grille tarifaire ou un lien vers la page ' +
        'tarifs.] \n\n' +
        'If you let me know which treatment you have in mind, I can give you a ' +
        'precise quote and recommend the most suitable option.';
      break;

    case 'services':
      body =
        'Dear ' + name + ',\n\n' +
        'Thank you for your message. At Elysian Paris we specialise in The ' +
        'Elysian Paris Method® — manual lymphatic drainage and bespoke body ' +
        'contouring, including post-surgery and prenatal care.\n\n' +
        '[À COMPLÉTER : décris brièvement le soin qui correspond à sa demande.]\n\n' +
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
        '[À COMPLÉTER : réponds ici au point précis soulevé par la personne.]';
      break;
  }

  return body + '\n\n' + CONFIG.SIGNATURE;
}
