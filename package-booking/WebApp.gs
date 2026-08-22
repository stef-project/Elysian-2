/**
 * ============================================================================
 *  WEBAPP.gs — Point d'entrée HTTP de la Web App (appelé par le site).
 * ============================================================================
 *
 *  ⚠️ Le frontend doit envoyer ses requêtes POST avec
 *  Content-Type: text/plain;charset=utf-8 (et non application/json) — sans
 *  quoi le navigateur déclenche une requête "preflight" OPTIONS que les Web
 *  Apps Apps Script ne savent pas traiter (erreur 405). Le corps envoyé
 *  reste du JSON valide, seul l'en-tête Content-Type change ; ce fichier lit
 *  e.postData.contents et fait le JSON.parse lui-même.
 *
 *  Chaque réponse est un JSON { success: boolean, data? , error? }. Aucune
 *  trace technique (stack, message d'exception brut) n'est jamais renvoyée :
 *  seules les erreurs métier (BookingBusinessError_ / RateLimitError_) sont
 *  transmises telles quelles, tout le reste devient un message générique.
 */

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (parseError) {
    return jsonResponse_({ success: false, error: 'Requête invalide.' });
  }

  const action = body.action;

  try {
    let data;
    switch (action) {
      case 'request-code':
        data = requestVerificationCode(body.email);
        break;

      case 'verify-code':
        data = verifyCodeAndIssueToken(body.email, body.code);
        break;

      case 'get-slots':
        data = handleGetSlots_(body.sessionToken, body.serviceId, body.durationMinutes);
        break;

      case 'get-client-dashboard':
        data = handleGetClientDashboard_(body.sessionToken);
        break;

      case 'revoke-session':
        // "Log out of this device" (/use-package) : invalide le jeton côté
        // serveur, pas seulement dans le localStorage du navigateur.
        data = revokeSessionToken_(body.sessionToken);
        break;

      case 'confirm-booking':
        data = confirmPackageBooking(
          body.sessionToken, body.bookingRequestId, body.serviceId, body.startIso, body.endIso
        );
        break;

      case 'get-offer':
        data = getOfferDetails(body.offerId, body.token);
        break;

      case 'respond-offer':
        data = respondToOffer(body.offerId, body.token, body.response);
        break;

      case 'validate-promo':
        // Valide un code promo pour un email + soin donné, et enregistre la
        // réclamation (une seule fois par email × code). Appelé depuis /book-chelsea.
        data = validateAndClaimPromoCode_(body.email, body.promoCode, body.serviceId);
        break;

      case 'admin-clients-overview':
        // Portail admin : chaque cliente, ses forfaits actifs, ses rendez-vous
        // à venir et ses codes promo applicables. Mot de passe vérifié à chaque appel.
        data = adminGetClientsOverview_(body.adminPassword);
        break;

      case 'admin-create-promo-code':
        // Écriture du portail admin : créer un code promo, généralement
        // réservé à une cliente précise. Même mot de passe + anti brute-force
        // que la vue d'ensemble ; même cœur de création que le menu Sheet.
        data = adminPortalCreatePromoCode_(body.adminPassword, body.params);
        break;

      case 'admin-cancel-promo-code':
        // Écriture du portail admin : annuler un code promo actif. Mêmes
        // protections ; même cœur d'annulation que le menu Sheet.
        data = adminPortalCancelPromoCode_(body.adminPassword, body.params);
        break;

      case 'admin-add-client':
        // Écriture du portail admin : créer une cliente (sans parrainage —
        // celui-ci reste côté menu Sheet, recherche interactive).
        data = adminPortalAddClient_(body.adminPassword, body.params);
        break;

      case 'admin-add-package':
        // Écriture du portail admin : attribuer un forfait immédiatement
        // actif (paiement suivi hors système — trace neutre à 0 dans
        // Payments pour l'invariant "aucun forfait actif sans trace").
        data = adminPortalAddPackage_(body.adminPassword, body.params);
        break;

      case 'list-public-packages':
        // Achat en ligne : catalogue des forfaits publiés (visibilite=public,
        // statut=actif), lecture seule, sans authentification.
        data = listPublicPackageTemplates_();
        break;

      case 'create-checkout-session':
        // Achat en ligne : ouvre une session Stripe Checkout pour le forfait
        // choisi. Prix recalculé côté serveur, jamais fourni par le client.
        data = createCheckoutSession_(body.templateId, body.email, body.prenom, body.nom);
        break;

      case 'confirm-checkout-session':
        // Achat en ligne : appelée au retour de Stripe (success_url). Vérifie
        // directement auprès de Stripe avant de créer le forfait — idempotent.
        data = confirmCheckoutSession_(body.sessionId);
        break;

      case 'submit-package-claim':
        // "Register my package" (/use-package) : cliente avec un forfait mais sans email connu du
        // système (vente historique). Crée une demande "en attente" à valider
        // depuis le portail admin.
        data = submitPackageClaim_(body.email, body.prenom, body.nom, body.telephone, body.message);
        break;

      case 'admin-list-package-claims':
        // Portail admin : demandes de forfait en attente de validation.
        data = adminPortalListPackageClaims_(body.adminPassword);
        break;

      case 'admin-approve-package-claim':
        // Portail admin : valide une demande — crée la cliente si besoin et
        // son forfait (même cœur que "Ajouter un forfait").
        data = adminPortalApprovePackageClaim_(body.adminPassword, body.params);
        break;

      case 'admin-reject-package-claim':
        // Portail admin : rejette une demande (email non reconnu, doublon...).
        data = adminPortalRejectPackageClaim_(body.adminPassword, body.params);
        break;

      default:
        return jsonResponse_({ success: false, error: 'Action inconnue.' });
    }
    return jsonResponse_({ success: true, data: data });
  } catch (err) {
    if (err instanceof BookingBusinessError_ || err instanceof RateLimitError_) {
      return jsonResponse_({ success: false, error: err.message });
    }
    // Erreur inattendue : on logge le détail côté serveur, on ne renvoie
    // qu'un message générique côté client (aucune info technique exposée).
    Logger.log('Erreur inattendue dans doPost (action=' + action + ') : ' + err + '\n' + err.stack);
    return jsonResponse_({ success: false, error: 'Une erreur est survenue, merci de réessayer.' });
  }
}

function doGet(e) {
  return jsonResponse_({ success: false, error: 'Cette Web App ne répond qu\'aux requêtes POST.' });
}

/** Valide le jeton de session et renvoie les créneaux disponibles pour le soin demandé. */
function handleGetSlots_(sessionTokenPlain, serviceId, durationMinutes) {
  if (!sessionTokenPlain) {
    throw new BookingBusinessError_('Session invalide.');
  }
  const tokenHash = hashWithPepper_(sessionTokenPlain);
  const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    throw new BookingBusinessError_('Session invalide ou expirée, merci de recommencer la vérification.');
  }

  const pkg = findPackageById_(tokenRow.package_id);
  const included = String(pkg.soins_inclus || '').split(',').map((s) => s.trim());
  if (included.indexOf(serviceId) === -1) {
    throw new BookingBusinessError_('Ce soin n\'est pas inclus dans ce forfait.');
  }

  const duration = Number(durationMinutes) || DEFAULT_APPOINTMENT_MINUTES;
  return { slots: computeAvailableSlots(duration) };
}

/**
 * Valide le jeton de session et renvoie le solde du forfait + les
 * prochains rendez-vous confirmés de la cliente — affiché avant la
 * sélection de créneau sur /use-package (UX : la cliente voit où elle en
 * est avant de réserver, sans avoir à appeler).
 */
function handleGetClientDashboard_(sessionTokenPlain) {
  if (!sessionTokenPlain) {
    throw new BookingBusinessError_('Session invalide.');
  }
  const tokenHash = hashWithPepper_(sessionTokenPlain);
  const tokenRow = findRowBy_(TABS.SESSION_TOKENS, 'token_hash', tokenHash);
  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    throw new BookingBusinessError_('Session invalide ou expirée, merci de recommencer la vérification.');
  }

  const pkg = findPackageById_(tokenRow.package_id);
  const now = new Date();
  const upcomingBookings = readAllRows_(TABS.BOOKINGS)
    .filter((b) => b.client_id === tokenRow.client_id && b.status === BOOKING_STATUS.CONFIRMED && new Date(b.start_datetime) > now)
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .map((b) => ({ serviceId: b.service_id, start: b.start_datetime, end: b.end_datetime }));

  return {
    packageName: pkg ? pkg.nom_forfait : '',
    availableSessions: pkg ? Number(pkg.available_sessions) : 0,
    upcomingBookings: upcomingBookings,
    activePromoCodes: findActivePromoCodesForClient_(tokenRow.client_id),
    // Nécessaire pour reprendre une réservation après une reconnexion
    // silencieuse (jeton retrouvé côté navigateur, /use-package) sans repasser
    // par verifyCodeAndIssueToken, qui est la seule autre source de ce champ.
    eligibleServices: pkg ? String(pkg.soins_inclus || '').split(',').map((s) => s.trim()) : [],
  };
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
