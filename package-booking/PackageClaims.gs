/**
 * ============================================================================
 *  PACKAGECLAIMS.gs — Demande de forfait pour une cliente sans email connu.
 * ============================================================================
 *
 *  Problème résolu : de nombreuses clientes ont un forfait acheté avant la
 *  mise en place de ce système (vente en personne, ClassPass, etc.) sans que
 *  leur email n'ait jamais été collecté. Pour elles, /use-package ne peut
 *  envoyer aucun code (requestVerificationCode, PackageVerification.gs, ne
 *  trouve aucune cliente pour cet email) — l'onglet "Register my package" de /use-package est la porte de
 *  sortie : la cliente indique son email (+ prénom/nom/téléphone/message),
 *  ça crée une demande "en attente" que l'administratrice valide depuis le
 *  portail admin, ce qui crée la cliente (si besoin) ET son forfait en un
 *  seul geste — même cœur de création que "Ajouter un forfait" (Portal.gs,
 *  createActivePackageWithPayment_), jamais dupliqué.
 *
 *  Réponse toujours générique (même succès qu'un email déjà en double) —
 *  pas d'anti-énumération à proprement parler ici (contrairement au code de
 *  vérification, la demande elle-même ne révèle rien de sensible), mais on
 *  évite quand même de révéler si une demande existe déjà pour cet email.
 */

/**
 * Soumission publique d'une demande de forfait. Rate-limitée par email (même
 * principe que enforceCodeRequestRateLimit_, Security.gs) pour éviter le
 * spam d'un endpoint public non authentifié.
 */
function submitPackageClaim_(email, prenom, nom, telephone, message) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.indexOf('@') === -1) {
    throw new BookingBusinessError_('Adresse email invalide.');
  }
  const trimmedPrenom = String(prenom || '').trim();
  if (!trimmedPrenom) {
    throw new BookingBusinessError_('Prénom manquant.');
  }

  enforceClaimRateLimit_(normalizedEmail);

  // Une demande déjà en attente pour cet email : pas de doublon inutile dans
  // la file de l'admin (ex. double-clic, ou la cliente retente le formulaire).
  const existingPending = readAllRows_(TABS.PACKAGE_CLAIMS).find((c) =>
    String(c.email).toLowerCase() === normalizedEmail && c.statut === PACKAGE_CLAIM_STATUS.PENDING
  );
  if (existingPending) {
    return { message: PACKAGE_CLAIM_CONFIRMATION_MESSAGE };
  }

  appendRow_(TABS.PACKAGE_CLAIMS, {
    claim_id: genId_('CLM'),
    email: normalizedEmail,
    prenom: trimmedPrenom,
    nom: String(nom || '').trim(),
    telephone: String(telephone || '').trim(),
    message: String(message || '').trim().slice(0, 500),
    statut: PACKAGE_CLAIM_STATUS.PENDING,
    created_at: new Date(),
    resolved_at: '',
    package_id_resultant: '',
    notes_admin: '',
  });

  return { message: PACKAGE_CLAIM_CONFIRMATION_MESSAGE };
}

const PACKAGE_CLAIM_CONFIRMATION_MESSAGE =
  "Thank you — we've received your request and will activate your package within 24 hours.";

/** Anti-spam dédié, même principe que enforceCheckoutRateLimit_ (Stripe.gs). */
function enforceClaimRateLimit_(email) {
  const props = PropertiesService.getScriptProperties();
  const key = 'claim_count::' + String(email).toLowerCase();
  const windowKey = 'claim_window::' + String(email).toLowerCase();
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

/**
 * Portail admin : liste des demandes en attente, les plus anciennes en
 * premier (traitement dans l'ordre d'arrivée). Les demandes déjà résolues
 * (approuvées/rejetées) ne sont pas renvoyées — elles restent consultables
 * directement dans le Sheet si besoin.
 */
function adminPortalListPackageClaims_(passwordPlain) {
  authenticateAdmin_(passwordPlain);

  return readAllRows_(TABS.PACKAGE_CLAIMS)
    .filter((c) => c.statut === PACKAGE_CLAIM_STATUS.PENDING)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((c) => ({
      claimId: c.claim_id,
      email: c.email,
      prenom: c.prenom,
      nom: c.nom,
      telephone: c.telephone,
      message: c.message,
      createdAt: c.created_at,
    }));
}

/**
 * Approuve une demande : crée la cliente si elle n'existe pas encore (sinon
 * réutilise la fiche existante — une même cliente peut avoir soumis la
 * demande alors qu'elle existait déjà pour une autre raison), puis crée le
 * forfait avec exactement le même cœur que "Ajouter un forfait" (Portal.gs).
 * params : mêmes champs que adminPortalAddPackage_ (packageName,
 * servicesIncluded, totalSessions, availableSessions, expirationDate,
 * amountPaid, paymentMethod) + claimId.
 */
function adminPortalApprovePackageClaim_(passwordPlain, params) {
  authenticateAdmin_(passwordPlain);

  const claimId = String((params && params.claimId) || '').trim();
  const claim = claimId ? findRowBy_(TABS.PACKAGE_CLAIMS, 'claim_id', claimId) : null;
  if (!claim) throw new BookingBusinessError_('Demande introuvable.');
  if (claim.statut !== PACKAGE_CLAIM_STATUS.PENDING) {
    throw new BookingBusinessError_('Cette demande a déjà été traitée.');
  }

  const client = findOrCreateClientFromClaim_(claim);
  const result = createActivePackageWithPayment_(client, params, 'admin_portal_claim');

  // Contrairement à "Ajouter un forfait" (adminPortalAddPackage_, où l'admin
  // est déjà en contact direct avec la cliente et n'a donc pas besoin de cet
  // email), ici la cliente a soumis sa demande elle-même et n'a aucun autre
  // moyen de savoir que son forfait est prêt — l'email est donc indispensable.
  sendPostPurchaseConfirmation_(result.packageId);

  updateRow_(TABS.PACKAGE_CLAIMS, claim.rowNumber, {
    statut: PACKAGE_CLAIM_STATUS.APPROVED,
    resolved_at: new Date(),
    package_id_resultant: result.packageId,
  });
  writeAuditLog_('admin_portal', 'approve_package_claim', claimId, PACKAGE_CLAIM_STATUS.PENDING, PACKAGE_CLAIM_STATUS.APPROVED, `Forfait ${result.packageId} créé pour ${client.client_id}`);

  return { packageId: result.packageId, clientId: client.client_id };
}

/** Trouve la cliente par email, ou la crée à partir des infos de la demande. */
function findOrCreateClientFromClaim_(claim) {
  const email = String(claim.email).trim().toLowerCase();
  const existing = findClientByEmail_(email);
  if (existing) return existing;

  const clientId = genId_('CLI');
  appendRow_(TABS.CLIENTS, {
    client_id: clientId,
    prenom: claim.prenom,
    nom: claim.nom,
    email: email,
    telephone: claim.telephone || '',
    notes_admin: '',
    date_creation: new Date(),
    tags: '',
  });
  writeAuditLog_('admin_portal', 'add_client', clientId, '', email, `Créée via validation de demande de forfait ${claim.claim_id}`);
  return findRowBy_(TABS.CLIENTS, 'client_id', clientId);
}

/** Rejette une demande (email non reconnu, forfait introuvable, doublon, etc.). */
function adminPortalRejectPackageClaim_(passwordPlain, params) {
  authenticateAdmin_(passwordPlain);

  const claimId = String((params && params.claimId) || '').trim();
  const claim = claimId ? findRowBy_(TABS.PACKAGE_CLAIMS, 'claim_id', claimId) : null;
  if (!claim) throw new BookingBusinessError_('Demande introuvable.');
  if (claim.statut !== PACKAGE_CLAIM_STATUS.PENDING) {
    throw new BookingBusinessError_('Cette demande a déjà été traitée.');
  }

  const reason = String((params && params.reason) || '').trim();
  updateRow_(TABS.PACKAGE_CLAIMS, claim.rowNumber, {
    statut: PACKAGE_CLAIM_STATUS.REJECTED,
    resolved_at: new Date(),
    notes_admin: reason,
  });
  writeAuditLog_('admin_portal', 'reject_package_claim', claimId, PACKAGE_CLAIM_STATUS.PENDING, PACKAGE_CLAIM_STATUS.REJECTED, reason);

  return { claimId: claimId };
}
