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

      case 'confirm-booking':
        data = confirmPackageBooking(
          body.sessionToken, body.bookingRequestId, body.serviceId, body.startIso, body.endIso
        );
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

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
