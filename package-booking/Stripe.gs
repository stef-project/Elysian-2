/**
 * ============================================================================
 *  STRIPE.gs — Achat en ligne d'un forfait publié (Stripe Checkout).
 * ============================================================================
 *
 *  Flow : la cliente choisit un modèle de forfait PUBLIC et actif
 *  (Package_Templates, PackageTemplates.gs), saisit son email, est redirigée
 *  vers une page de paiement hébergée par Stripe (aucune donnée de carte ne
 *  transite jamais par ce serveur), puis revient sur une page de confirmation
 *  qui vérifie le paiement directement auprès de Stripe avant de créer quoi
 *  que ce soit.
 *
 *  ⚠️ Confirmation par REDIRECTION, pas par webhook entrant : les Web Apps
 *  Apps Script n'exposent pas les en-têtes HTTP arbitraires d'une requête
 *  entrante (doPost(e) ne donne accès ni à Stripe-Signature ni à aucun autre
 *  en-tête personnalisé), ce qui rend la vérification de signature de
 *  webhook Stripe telle que documentée impossible à implémenter ici de façon
 *  fiable. À la place : la page de succès Stripe redirige la cliente vers le
 *  site avec l'identifiant de session, et confirmCheckoutSession_ interroge
 *  l'API Stripe DIRECTEMENT (avec la clé secrète, jamais exposée côté
 *  client) pour vérifier que le paiement a réellement abouti avant de créer
 *  le forfait — aucune confiance accordée à la redirection elle-même.
 *
 *  Compromis assumé : si la cliente ferme l'onglet juste après avoir payé
 *  mais avant la redirection de retour (perte réseau, fermeture manuelle),
 *  le forfait n'est jamais créé automatiquement. Le paiement reste visible
 *  dans le tableau de bord Stripe ; l'administratrice peut alors créer le
 *  forfait manuellement via le portail admin (/admin) ou le menu Sheet, avec
 *  le vrai montant. Pas de webhook de secours pour l'instant — à ajouter
 *  plus tard si ce cas s'avère fréquent en pratique.
 *
 *  Prix TOUJOURS recalculé côté serveur à partir de Package_Templates au
 *  moment de la création de la session ET revérifié à la confirmation —
 *  jamais un montant fourni par le client.
 */

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/** Renvoie la clé secrète Stripe, ou lève une erreur claire si jamais configurée. */
function getStripeSecretKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');
  if (!key) {
    throw new Error('Stripe n\'est pas configuré (STRIPE_SECRET_KEY manquante) — voir menu Elysian Admin > Portail web.');
  }
  return key;
}

/** Définit (ou change) la clé secrète Stripe — jamais affichée en clair après saisie, jamais dans Git/le Sheet. */
function adminSetStripeSecretKey() {
  const ui = ui_();
  const response = ui.prompt('Clé secrète Stripe (sk_live_... ou sk_test_...) :');
  const key = response.getResponseText().trim();
  if (!key || key.indexOf('sk_') !== 0) {
    ui.alert('Clé invalide (doit commencer par "sk_") — inchangée.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('STRIPE_SECRET_KEY', key);
  writeAuditLog_('admin', 'set_stripe_secret_key', 'stripe', '', key.indexOf('sk_live_') === 0 ? 'live' : 'test', '');
  ui.alert(`Clé Stripe enregistrée (mode ${key.indexOf('sk_live_') === 0 ? 'LIVE — paiements réels' : 'test'}).`);
}

/**
 * Aplatit un objet imbriqué en paires clé/valeur au format attendu par
 * l'API REST de Stripe (application/x-www-form-urlencoded avec notation à
 * crochets, ex. line_items[0][price_data][unit_amount]=12000). L'API Stripe
 * n'accepte pas de corps JSON en requête, contrairement à ses réponses.
 */
function flattenForStripe_(obj, prefix) {
  const pairs = [];
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object') {
          pairs.push(...flattenForStripe_(item, `${paramKey}[${i}]`));
        } else {
          pairs.push([`${paramKey}[${i}]`, String(item)]);
        }
      });
    } else if (typeof value === 'object') {
      pairs.push(...flattenForStripe_(value, paramKey));
    } else {
      pairs.push([paramKey, String(value)]);
    }
  });
  return pairs;
}

/**
 * Appel générique à l'API REST Stripe. Lève une erreur avec le message
 * Stripe si la requête échoue (jamais affichée telle quelle à la cliente —
 * seul WebApp.gs décide de ce qui est montrable, via BookingBusinessError_).
 */
function stripeRequest_(method, path, params) {
  const pairs = params ? flattenForStripe_(params, '') : [];
  const payload = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const url = method === 'get' && payload ? `${STRIPE_API_BASE}${path}?${payload}` : `${STRIPE_API_BASE}${path}`;

  const options = {
    method: method,
    headers: { Authorization: 'Bearer ' + getStripeSecretKey_() },
    muteHttpExceptions: true,
  };
  if (method !== 'get') {
    options.contentType = 'application/x-www-form-urlencoded';
    options.payload = payload;
  }

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());

  if (status >= 400) {
    const message = body && body.error && body.error.message ? body.error.message : `Erreur Stripe (${status}).`;
    throw new Error(message);
  }
  return body;
}

/**
 * Modèles de forfait publiables tels qu'exposés publiquement — jamais les
 * modèles "private"/premium (proposés uniquement par l'administratrice via
 * "Proposer un forfait"), jamais notes_internes.
 */
function listPublicPackageTemplates_() {
  return readAllRows_(TABS.PACKAGE_TEMPLATES)
    .filter((t) => t.statut === PACKAGE_TEMPLATE_STATUS.ACTIVE && t.visibilite === PACKAGE_TEMPLATE_VISIBILITY.PUBLIC)
    .sort((a, b) => Number(a.ordre_affichage || 0) - Number(b.ordre_affichage || 0))
    .map((t) => ({
      templateId: t.package_template_id,
      nom: t.nom,
      description: t.description,
      soinsInclus: String(t.soins_inclus || '').split(',').map((s) => s.trim()).filter(Boolean),
      nombreSeances: Number(t.nombre_seances),
      prixPublic: Number(t.prix_public),
      dureeValiditeJours: t.duree_validite_jours ? Number(t.duree_validite_jours) : null,
    }));
}

/**
 * Anti-abus dédié à la création de session de paiement (endpoint public,
 * sans OTP) — pas pour bloquer un brute-force de mot de passe (il n'y en a
 * pas ici) mais pour éviter qu'un script ne spamme la création de sessions
 * Stripe (quota API, bruit dans le tableau de bord Stripe). Même principe
 * que enforceCodeRequestRateLimit_ (Security.gs), clé dédiée par email.
 */
function enforceCheckoutRateLimit_(email) {
  const props = PropertiesService.getScriptProperties();
  const key = 'checkout_count::' + String(email).toLowerCase();
  const windowKey = 'checkout_window::' + String(email).toLowerCase();
  const windowStart = props.getProperty(windowKey);
  const now = Date.now();

  if (!windowStart || now - Number(windowStart) > 60 * 60 * 1000) {
    props.setProperty(windowKey, String(now));
    props.setProperty(key, '1');
    return;
  }
  const count = parseInt(props.getProperty(key) || '0', 10) + 1;
  if (count > 10) {
    throw new RateLimitError_('Trop de tentatives. Réessaie plus tard ou contacte-nous directement.');
  }
  props.setProperty(key, String(count));
}

/**
 * Crée une session Stripe Checkout pour un modèle de forfait public. Le
 * prix est TOUJOURS recalculé ici à partir de Package_Templates — jamais
 * fourni par le client.
 *
 * @returns {{checkoutUrl: string}}
 */
function createCheckoutSession_(templateId, email, prenom, nom) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.indexOf('@') === -1) {
    throw new BookingBusinessError_('Adresse email invalide.');
  }
  if (!String(prenom || '').trim()) {
    throw new BookingBusinessError_('Prénom manquant.');
  }
  enforceCheckoutRateLimit_(normalizedEmail);

  const template = findPackageTemplateById_(templateId);
  if (!template || template.statut !== PACKAGE_TEMPLATE_STATUS.ACTIVE || template.visibilite !== PACKAGE_TEMPLATE_VISIBILITY.PUBLIC) {
    throw new BookingBusinessError_('Ce forfait n\'est plus disponible à l\'achat en ligne.');
  }

  const price = Number(template.prix_public);
  if (isNaN(price) || price <= 0) {
    throw new BookingBusinessError_('Ce forfait n\'a pas de prix valide — contacte-nous directement.');
  }
  const unitAmountPence = Math.round(price * 100);

  const settings = getSettings();
  const baseUrl = String(settings.site_base_url || '').replace(/\/$/, '');

  const session = stripeRequest_('post', '/checkout/sessions', {
    mode: 'payment',
    customer_email: normalizedEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: unitAmountPence,
          product_data: { name: template.nom },
        },
      },
    ],
    success_url: `${baseUrl}/buy-package/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/buy-package?cancelled=1`,
    metadata: {
      package_template_id: template.package_template_id,
      prenom: String(prenom || '').trim(),
      nom: String(nom || '').trim(),
      // Cliché du forfait au moment du paiement — jamais relu depuis
      // Package_Templates à la confirmation, pour que la cliente reçoive
      // exactement ce qu'elle a vu et payé même si le modèle est ensuite
      // modifié ou désactivé avant qu'elle ne revienne sur le site (le prix
      // Stripe est déjà figé dans la session ; sans ce cliché, seul le
      // MONTANT était protégé contre cette dérive, pas le contenu).
      snapshot_nom: template.nom,
      snapshot_soins_inclus: template.soins_inclus,
      snapshot_nombre_seances: String(template.nombre_seances),
      snapshot_duree_validite_jours: template.duree_validite_jours ? String(template.duree_validite_jours) : '',
    },
  });

  return { checkoutUrl: session.url };
}

/**
 * Confirme une session Stripe Checkout et crée le forfait correspondant.
 * Idempotent : un même session_id ne crée jamais deux forfaits, même
 * rappelé plusieurs fois (rechargement de la page de succès, retour
 * arrière du navigateur).
 *
 * @returns {{packageName: string, totalSessions: number}}
 */
function confirmCheckoutSession_(sessionId) {
  if (!sessionId) throw new BookingBusinessError_('Session de paiement manquante.');

  // Tout tient dans UN SEUL verrou, y compris la revérification d'idempotence
  // : la vérifier seulement AVANT le verrou ne suffit pas — deux appels
  // presque simultanés (page de succès rechargée pendant que le premier
  // tourne encore) passeraient tous les deux ce test avant qu'aucune ligne
  // Payments n'existe, et créeraient chacun un forfait en double.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new BookingBusinessError_('Le système est occupé, réessaie dans un instant.');
  }
  try {
    const existingPayment = findRowBy_(TABS.PAYMENTS, 'reference_transaction', sessionId);
    if (existingPayment) {
      const existingPkg = findPackageById_(existingPayment.package_id);
      return {
        packageName: existingPkg ? existingPkg.nom_forfait : '',
        totalSessions: existingPkg ? Number(existingPkg.total_sessions) : 0,
      };
    }

    const session = stripeRequest_('get', `/checkout/sessions/${encodeURIComponent(sessionId)}`, null);
    if (session.payment_status !== 'paid') {
      throw new BookingBusinessError_('Ce paiement n\'a pas encore abouti.');
    }

    // Contenu du forfait lu depuis le CLICHÉ posé à la création de la session
    // (jamais depuis Package_Templates, qui a pu changer entre-temps — voir
    // createCheckoutSession_).
    const meta = session.metadata || {};
    const templateId = meta.package_template_id;
    if (!templateId || !meta.snapshot_nom) {
      // Ne devrait jamais arriver (le cliché est toujours posé à la création
      // de la session) — mais on reste défensif plutôt que de créer un
      // forfait sans contenu défini.
      throw new Error('Détails du forfait introuvables pour cette session Stripe.');
    }

    const email = String((session.customer_details && session.customer_details.email) || session.customer_email || '').trim().toLowerCase();
    const prenom = meta.prenom || '';
    const nom = meta.nom || '';

    let client = findClientByEmail_(email);
    if (!client) {
      const clientId = genId_('CLI');
      appendRow_(TABS.CLIENTS, {
        client_id: clientId,
        prenom: prenom,
        nom: nom,
        email: email,
        telephone: '',
        notes_admin: '',
        date_creation: new Date(),
        tags: '',
      });
      writeAuditLog_('system', 'add_client', clientId, '', email, 'Créée via achat en ligne (Stripe)');
      client = findRowBy_(TABS.CLIENTS, 'client_id', clientId);
    }

    const nombreSeances = Number(meta.snapshot_nombre_seances);
    const packageId = genId_('PKG');
    const dateExpiration = meta.snapshot_duree_validite_jours
      ? new Date(Date.now() + Number(meta.snapshot_duree_validite_jours) * 24 * 60 * 60 * 1000)
      : '';
    appendRow_(TABS.PACKAGES, {
      package_id: packageId,
      client_id: client.client_id,
      nom_forfait: meta.snapshot_nom,
      soins_inclus: meta.snapshot_soins_inclus || '',
      total_sessions: nombreSeances,
      available_sessions: nombreSeances,
      reserved_sessions: 0,
      used_sessions: 0,
      date_achat: new Date(),
      date_expiration: dateExpiration,
      moyen_paiement: PAYMENT_METHOD.STRIPE,
      statut: PACKAGE_STATUS.PENDING_PAYMENT,
      notes_admin: 'Achat en ligne via Stripe Checkout',
      package_template_id: templateId,
    });

    const paymentId = genId_('PAY');
    const montantBrut = Number(session.amount_total) / 100;
    const { montant_net, taux_frais } = computePaymentFinancials_(montantBrut, 0);
    appendRow_(TABS.PAYMENTS, {
      payment_id: paymentId,
      client_id: client.client_id,
      package_id: packageId,
      montant_brut: montantBrut,
      devise: String(session.currency || 'gbp').toUpperCase(),
      moyen_paiement: PAYMENT_METHOD.STRIPE,
      fournisseur_paiement: 'Stripe',
      frais_paiement: 0,
      montant_net: montant_net,
      taux_frais: taux_frais,
      date_paiement: new Date(),
      reference_transaction: sessionId,
      statut_paiement: PAYMENT_STATUS.CONFIRME,
      justificatif_notes: 'Frais Stripe non calculés automatiquement — à corriger manuellement si besoin (Payments).',
      mode_saisie: PAYMENT_ENTRY_MODE.AUTOMATIQUE,
    });

    // Active le forfait + envoie la confirmation post-achat + vérifie les
    // paliers de parrainage — même fonction que le reste du système, pour
    // ne jamais dupliquer ces effets de bord (Payments.gs).
    activatePackageIfPending_(packageId, paymentId);

    return { packageName: meta.snapshot_nom, totalSessions: nombreSeances };
  } finally {
    lock.releaseLock();
  }
}
