/**
 * ============================================================================
 *  PACKAGEOFFERS.gs — "Proposer un forfait" (Phase 2, Étape B).
 * ============================================================================
 *
 *  Une offre est un LIEN à durée de vie limitée que l'administratrice
 *  envoie elle-même (WhatsApp/email) à une cliente. Le lien porte un jeton
 *  opaque, haché en HMAC (hashWithPepper_, réutilisé de Security.gs) avant
 *  stockage — comme pour les jetons de session, le jeton en clair n'est
 *  JAMAIS conservé nulle part après sa génération.
 *
 *  ⚠️ Règle absolue : consulter ou accepter une offre ne crée AUCUN forfait
 *  et ne débite RIEN. Seule adminConvertOfferToPackage (déclenchée par
 *  l'administratrice, jamais automatiquement) crée un forfait réel — et ce
 *  forfait reste "pending_payment" tant que Payments.gs n'a pas confirmé un
 *  paiement, exactement comme pour adminAddPackage (AdminMenu.gs).
 *
 *  Ce fichier regroupe à la fois les fonctions "admin" (créer/annuler une
 *  offre, convertir) et les fonctions "publiques" (consultation/réponse par
 *  la cliente, appelées depuis WebApp.gs) — même organisation que
 *  PackageTemplates.gs et Payments.gs.
 */

// ─────────────────────────────────────────────────────────────────────────
//  Lecture / helpers partagés
// ─────────────────────────────────────────────────────────────────────────

function findOfferById_(offerId) {
  return findRowBy_(TABS.PACKAGE_OFFERS, 'offer_id', offerId);
}

/** Construit l'URL publique de consultation d'une offre. */
function buildOfferUrl_(offerId, tokenPlain) {
  const settings = getSettings();
  const base = String(settings.site_base_url || 'https://www.elysian-institute.com').replace(/\/$/, '');
  return `${base}/offer/${offerId}?token=${encodeURIComponent(tokenPlain)}`;
}

/**
 * Recherche une cliente par email ; si absente, propose de la créer tout de
 * suite (une offre s'adresse souvent à une toute nouvelle cliente, contrairement
 * à "Ajouter un rendez-vous forfait" qui suppose une cliente déjà existante).
 * Renvoie null si l'admin annule.
 */
function findOrPromptCreateClient_(email) {
  const ui = ui_();
  const existing = findClientByEmail_(email);
  if (existing) return existing;

  const create = ui.alert(`Aucune cliente trouvée avec "${email}". Créer une nouvelle cliente ?`, ui.ButtonSet.YES_NO);
  if (create !== ui.Button.YES) return null;

  const prenom = ui.prompt('Prénom de la cliente :').getResponseText().trim();
  const nom = ui.prompt('Nom de la cliente :').getResponseText().trim();
  const telephone = ui.prompt('Téléphone (optionnel) :').getResponseText().trim();
  const referralTag = promptReferralTag_();

  const clientId = genId_('CLI');
  appendRow_(TABS.CLIENTS, {
    client_id: clientId, prenom, nom, email, telephone,
    notes_admin: '', date_creation: new Date(),
    tags: referralTag,
  });
  writeAuditLog_('admin', 'add_client', clientId, '', email,
    referralTag ? `Créée via "Proposer un forfait" — parrainage : ${referralTag}` : 'Créée via "Proposer un forfait"');

  // Cliente parrainée : remise de bienvenue automatique (CRM.gs), comme dans
  // adminAddClient — même règle quel que soit le point d'entrée de création.
  if (referralTag) {
    const welcomeCode = grantReferralWelcomePromo_(clientId, referralTag);
    if (welcomeCode) {
      ui.alert(`Code de bienvenue créé automatiquement : ${welcomeCode} — communique-le à la cliente, il s'applique à son premier paiement.`);
    }
  }
  return findRowBy_(TABS.CLIENTS, 'client_id', clientId);
}

/** Petite modale HTML avec un champ en lecture seule + bouton copier — le lien n'est affiché qu'une fois. */
function showCopyableLinkDialog_(title, message, url) {
  const escapedUrl = url.replace(/"/g, '&quot;');
  const escapedMessage = String(message).replace(/</g, '&lt;');
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family: Arial, sans-serif; padding: 8px;">' +
    `<p>${escapedMessage}</p>` +
    `<input id="offerUrlInput" type="text" value="${escapedUrl}" readonly ` +
    'style="width: 100%; padding: 8px; font-size: 13px; box-sizing: border-box;" onclick="this.select();" />' +
    '<button id="copyBtn" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">Copier le lien</button>' +
    '<p id="copyStatus" style="color: green; font-size: 12px;"></p>' +
    '<script>' +
    'document.getElementById("copyBtn").addEventListener("click", function () {' +
    '  var input = document.getElementById("offerUrlInput");' +
    '  input.select(); input.setSelectionRange(0, 99999);' +
    '  function done() { document.getElementById("copyStatus").innerText = "Copié !"; }' +
    '  try {' +
    '    navigator.clipboard.writeText(input.value).then(done).catch(function () { document.execCommand("copy"); done(); });' +
    '  } catch (e) { document.execCommand("copy"); done(); }' +
    '});' +
    '</script>' +
    '</div>'
  ).setWidth(440).setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}

// ─────────────────────────────────────────────────────────────────────────
//  Fonctions admin
// ─────────────────────────────────────────────────────────────────────────

/**
 * "Proposer un forfait" : recherche/crée la cliente, sélectionne un modèle
 * du catalogue (ou saisie manuelle), permet d'ajuster séances/prix/validité,
 * génère un lien à durée de vie limitée. N'active jamais rien par elle-même.
 */
function adminCreatePackageOffer() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente (existante ou nouvelle) :').getResponseText().trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) { ui.alert('Email invalide, opération annulée.'); return; }
  const client = findOrPromptCreateClient_(email);
  if (!client) { ui.alert('Opération annulée.'); return; }

  const templateId = ui.prompt('package_template_id à proposer (laisser vide pour saisie manuelle) :').getResponseText().trim();
  let nom, soinsInclus, nombreSeances, prixFinal, dureeValiditeJours;

  if (templateId) {
    const tpl = findPackageTemplateById_(templateId);
    if (!tpl) { ui.alert('Modèle introuvable.'); return; }
    nom = tpl.nom;
    soinsInclus = tpl.soins_inclus;
    nombreSeances = Number(tpl.nombre_seances);
    prixFinal = Number(tpl.prix_public);
    dureeValiditeJours = tpl.duree_validite_jours || '';
  } else {
    nom = ui.prompt('Nom du forfait proposé :').getResponseText().trim();
    soinsInclus = ui.prompt('Soins inclus, séparés par des virgules :').getResponseText().trim();
    nombreSeances = parseInt(ui.prompt('Nombre de séances :').getResponseText().trim(), 10);
    prixFinal = parseFloat(ui.prompt('Prix proposé :').getResponseText().trim());
    dureeValiditeJours = ui.prompt('Durée de validité du forfait en jours (laisser vide si aucune) :').getResponseText().trim();
  }

  // Ajustement possible même si sourcé d'un modèle.
  const adjustSeances = ui.prompt(`Nombre de séances (actuel : ${nombreSeances}) — laisser vide pour garder :`).getResponseText().trim();
  if (adjustSeances) nombreSeances = parseInt(adjustSeances, 10);
  const adjustPrix = ui.prompt(`Prix proposé (actuel : ${prixFinal}) — laisser vide pour garder :`).getResponseText().trim();
  if (adjustPrix) prixFinal = parseFloat(adjustPrix);
  const adjustValidite = ui.prompt(`Durée de validité du forfait en jours (actuelle : ${dureeValiditeJours || 'aucune'}) — laisser vide pour garder :`).getResponseText().trim();
  if (adjustValidite) dureeValiditeJours = adjustValidite;

  if (isNaN(nombreSeances) || nombreSeances <= 0 || isNaN(prixFinal) || prixFinal < 0) {
    ui.alert('Valeurs invalides, opération annulée.');
    return;
  }

  const moyenPaiementRaw = ui.prompt(
    'Moyen de paiement proposé (informatif) : revolut_card_payment / revolut_pay / bank_transfer / ' +
    'stripe / classpass / card_in_person / cash / complimentary / other :'
  ).getResponseText().trim().toLowerCase();
  if (Object.values(PAYMENT_METHOD).indexOf(moyenPaiementRaw) === -1) { ui.alert('Moyen de paiement invalide.'); return; }

  const settings = getSettings();
  const validityDaysRaw = ui.prompt(`Durée de validité DU LIEN en jours (laisser vide pour ${settings.offer_default_validity_days}) :`).getResponseText().trim();
  const linkValidityDays = validityDaysRaw ? parseInt(validityDaysRaw, 10) : Number(settings.offer_default_validity_days);
  const expirationDate = new Date(Date.now() + linkValidityDays * 24 * 60 * 60 * 1000);

  const offerId = genId_('OFFER');
  const rawToken = generateSessionToken_(); // même primitive que les jetons de session
  const tokenHash = hashWithPepper_(rawToken);

  appendRow_(TABS.PACKAGE_OFFERS, {
    offer_id: offerId,
    client_id: client.client_id,
    package_template_id: templateId || '',
    nom_forfait: nom,
    soins_inclus: soinsInclus,
    nombre_seances: nombreSeances,
    prix_final: prixFinal,
    duree_validite_jours: dureeValiditeJours || '',
    moyen_paiement_propose: moyenPaiementRaw,
    statut: OFFER_STATUS.DRAFT,
    token_hash: tokenHash,
    date_proposition: new Date(),
    date_expiration_lien: expirationDate,
    date_envoi: '',
    date_consultation: '',
    date_reponse: '',
    notes_admin: '',
    package_id_resultant: '',
  });
  writeAuditLog_('admin', 'create_package_offer', offerId, '', `${nom} — ${prixFinal}`, '');

  const sendNow = ui.alert('Marquer cette offre comme envoyée maintenant ?', ui.ButtonSet.YES_NO);
  if (sendNow === ui.Button.YES) {
    updateRow_(TABS.PACKAGE_OFFERS, findOfferById_(offerId).rowNumber, {
      statut: OFFER_STATUS.SENT,
      date_envoi: new Date(),
    });
    writeAuditLog_('admin', 'mark_offer_sent', offerId, OFFER_STATUS.DRAFT, OFFER_STATUS.SENT, '');
  }

  const offerUrl = buildOfferUrl_(offerId, rawToken);
  showCopyableLinkDialog_(
    'Offre créée',
    'Ce lien ne sera plus jamais affiché ici — copie-le maintenant pour l\'envoyer par WhatsApp ou email :',
    offerUrl
  );
}

/** Pour une offre restée "draft" (créée mais pas encore envoyée) : la marquer envoyée sans régénérer le lien. */
function adminMarkOfferSent() {
  const ui = ui_();
  const offerId = ui.prompt('offer_id à marquer comme envoyée :').getResponseText().trim();
  const offer = findOfferById_(offerId);
  if (!offer) { ui.alert('Offre introuvable.'); return; }
  if (offer.statut !== OFFER_STATUS.DRAFT) { ui.alert(`Cette offre est déjà au statut "${offer.statut}".`); return; }

  updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, { statut: OFFER_STATUS.SENT, date_envoi: new Date() });
  writeAuditLog_('admin', 'mark_offer_sent', offerId, OFFER_STATUS.DRAFT, OFFER_STATUS.SENT, '');
  ui.alert('Offre marquée comme envoyée.');
}

function adminCancelOffer() {
  const ui = ui_();
  const offerId = ui.prompt('offer_id à annuler :').getResponseText().trim();
  const offer = findOfferById_(offerId);
  if (!offer) { ui.alert('Offre introuvable.'); return; }
  if ([OFFER_STATUS.PAID, OFFER_STATUS.CANCELLED].indexOf(offer.statut) !== -1) {
    ui.alert(`Cette offre est déjà "${offer.statut}", rien à annuler.`);
    return;
  }
  const motif = ui.prompt('Motif de l\'annulation (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire, opération annulée.'); return; }

  updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, { statut: OFFER_STATUS.CANCELLED });
  writeAuditLog_('admin', 'cancel_offer', offerId, offer.statut, OFFER_STATUS.CANCELLED, motif);
  ui.alert('Offre annulée.');
}

/**
 * Convertit une offre en forfait réel. N'autorise la conversion que si
 * statut = accepted (ou dérogation explicite motivée). Vérifie et marque
 * package_id_resultant À L'INTÉRIEUR d'un ScriptLock, immédiatement après
 * la création du forfait — ferme la fenêtre de double-conversion en cas de
 * double-clic sur le menu. Réutilise ensuite promptAndRecordPayment_
 * (Payments.gs), exactement comme adminAddPackage — rien n'est dupliqué.
 */
function adminConvertOfferToPackage() {
  const ui = ui_();
  const offerId = ui.prompt('offer_id à convertir en forfait :').getResponseText().trim();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert('Le système est occupé, réessaie dans un instant.'); return; }

  let packageId;
  try {
    const offer = findOfferById_(offerId);
    if (!offer) { ui.alert('Offre introuvable.'); return; }

    // Intégrité : une offre ne peut être convertie qu'une seule fois.
    if (offer.package_id_resultant) {
      ui.alert(`Cette offre a déjà été convertie en forfait ${offer.package_id_resultant}.`);
      return;
    }

    let motifOverride = '';
    if (offer.statut !== OFFER_STATUS.ACCEPTED) {
      const override = ui.alert(
        `Cette offre n'est pas au statut "accepted" (statut actuel : "${offer.statut}").\n\n` +
        'Forcer la conversion quand même (dérogation) ?',
        ui.ButtonSet.YES_NO
      );
      if (override !== ui.Button.YES) { ui.alert('Opération annulée.'); return; }
      motifOverride = ui.prompt('Motif de la dérogation (obligatoire) :').getResponseText().trim();
      if (!motifOverride) { ui.alert('Motif obligatoire pour une dérogation, opération annulée.'); return; }
    }

    const client = findRowBy_(TABS.CLIENTS, 'client_id', offer.client_id);
    if (!client) { ui.alert('Cliente introuvable pour cette offre.'); return; }

    let dateExpirationRaw = '';
    if (offer.duree_validite_jours) {
      const exp = new Date(Date.now() + Number(offer.duree_validite_jours) * 24 * 60 * 60 * 1000);
      dateExpirationRaw = Utilities.formatDate(exp, getSettings().timezone, 'yyyy-MM-dd');
    }

    packageId = genId_('PKG');
    appendRow_(TABS.PACKAGES, {
      package_id: packageId,
      client_id: client.client_id,
      nom_forfait: offer.nom_forfait,
      soins_inclus: offer.soins_inclus,
      total_sessions: Number(offer.nombre_seances),
      available_sessions: Number(offer.nombre_seances),
      reserved_sessions: 0,
      used_sessions: 0,
      date_achat: new Date(),
      date_expiration: dateExpirationRaw,
      moyen_paiement: '',
      statut: PACKAGE_STATUS.PENDING_PAYMENT,
      notes_admin: '',
      package_template_id: offer.package_template_id || '',
    });

    // Marqué IMMÉDIATEMENT, toujours à l'intérieur du verrou : ferme la
    // fenêtre de double-conversion le plus tôt possible.
    updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, { package_id_resultant: packageId });

    writeAuditLog_(
      'admin', 'convert_offer_to_package', offerId, offer.statut, packageId,
      motifOverride ? `Dérogation : ${motifOverride}` : 'Conversion normale (offre acceptée)'
    );
  } finally {
    lock.releaseLock();
  }

  // Saisie du paiement HORS du verrou (interactive, potentiellement longue) —
  // n'a pas besoin d'être dans la même section critique : package_id_resultant
  // est déjà marqué, donc aucune double-conversion n'est plus possible ici.
  const dejaRecu = ui.alert(`Forfait créé : ${packageId} (pending_payment).\n\nLe paiement est-il déjà reçu ?`, ui.ButtonSet.YES_NO);
  if (dejaRecu !== ui.Button.YES) {
    ui.alert(`Forfait ${packageId} reste "pending_payment" — utilise "Enregistrer un paiement" une fois reçu.`);
    return;
  }
  const paymentId = promptAndRecordPayment_(packageId, { forceConfirmed: true });
  if (!paymentId) {
    ui.alert(`Forfait ${packageId} créé, mais la saisie du paiement a été annulée — reste "pending_payment".`);
    return;
  }
  ui.alert(`Forfait ${packageId} activé (paiement ${paymentId}). L'offre ${offerId} passera à "paid" automatiquement.`);
}

// ─────────────────────────────────────────────────────────────────────────
//  Fonctions publiques (appelées depuis WebApp.gs — page cliente /offer/:id)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Valide le jeton (haché) et l'expiration d'une offre. Lève une erreur
 * métier générique en cas d'échec — jamais de détail technique exposé.
 */
function validateOfferToken_(offerId, tokenPlain) {
  if (!offerId || !tokenPlain) {
    throw new BookingBusinessError_('Lien invalide.');
  }
  const offer = findOfferById_(offerId);
  if (!offer) {
    throw new BookingBusinessError_('Lien invalide ou expiré.');
  }
  const tokenHash = hashWithPepper_(tokenPlain);
  if (offer.token_hash !== tokenHash) {
    throw new BookingBusinessError_('Lien invalide ou expiré.');
  }
  if (offer.date_expiration_lien && new Date(offer.date_expiration_lien) < new Date()) {
    if (offer.statut !== OFFER_STATUS.EXPIRED) {
      updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, { statut: OFFER_STATUS.EXPIRED });
      writeAuditLog_('system', 'offer_expired_on_access', offer.offer_id, offer.statut, OFFER_STATUS.EXPIRED, '');
    }
    throw new BookingBusinessError_('Ce lien a expiré. Contacte l\'institut pour une nouvelle offre.');
  }
  if ([OFFER_STATUS.CANCELLED, OFFER_STATUS.DECLINED].indexOf(offer.statut) !== -1) {
    throw new BookingBusinessError_('Cette offre n\'est plus disponible.');
  }
  return offer;
}

/**
 * Consultation de l'offre par la cliente. C'EST CET APPEL BACKEND (et lui
 * seul) qui fait passer draft/sent -> viewed — jamais le frontend seul, pour
 * qu'un lien expiré ou déjà répondu ne puisse jamais s'afficher depuis un
 * cache navigateur sans revalidation serveur.
 */
function getOfferDetails(offerId, tokenPlain) {
  const offer = validateOfferToken_(offerId, tokenPlain);

  if ([OFFER_STATUS.DRAFT, OFFER_STATUS.SENT].indexOf(offer.statut) !== -1) {
    updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, {
      statut: OFFER_STATUS.VIEWED,
      date_consultation: new Date(),
    });
    writeAuditLog_(offer.client_id, 'offer_viewed', offer.offer_id, offer.statut, OFFER_STATUS.VIEWED, '');
  }

  const client = findRowBy_(TABS.CLIENTS, 'client_id', offer.client_id);
  const refreshed = findOfferById_(offerId); // relire après la mise à jour éventuelle ci-dessus
  return {
    prenom: client ? client.prenom : '',
    nomForfait: refreshed.nom_forfait,
    soinsInclus: String(refreshed.soins_inclus || '').split(',').map((s) => s.trim()),
    nombreSeances: Number(refreshed.nombre_seances),
    prixFinal: Number(refreshed.prix_final),
    dureeValiditeJours: refreshed.duree_validite_jours || null,
    moyenPaiementPropose: refreshed.moyen_paiement_propose,
    statut: refreshed.statut,
  };
}

/**
 * Réponse de la cliente (accepter/refuser). Ne crée jamais de forfait, ne
 * débite jamais rien — uniquement un changement de statut. Refuse toute
 * réponse si l'offre a déjà été répondue/payée/annulée.
 */
function respondToOffer(offerId, tokenPlain, response) {
  if (['accept', 'decline'].indexOf(response) === -1) {
    throw new BookingBusinessError_('Réponse invalide.');
  }
  const offer = validateOfferToken_(offerId, tokenPlain);
  if ([OFFER_STATUS.SENT, OFFER_STATUS.VIEWED].indexOf(offer.statut) === -1) {
    throw new BookingBusinessError_('Cette offre a déjà reçu une réponse ou n\'est plus modifiable.');
  }

  const newStatus = response === 'accept' ? OFFER_STATUS.ACCEPTED : OFFER_STATUS.DECLINED;
  updateRow_(TABS.PACKAGE_OFFERS, offer.rowNumber, {
    statut: newStatus,
    date_reponse: new Date(),
  });
  writeAuditLog_(offer.client_id, 'offer_' + response + 'ed_by_client', offer.offer_id, offer.statut, newStatus, '');

  return { statut: newStatus };
}
