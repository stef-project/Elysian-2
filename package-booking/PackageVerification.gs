/**
 * ============================================================================
 *  PACKAGEVERIFICATION.gs — Vérification d'identité par email + code.
 * ============================================================================
 *
 *  Réponses volontairement génériques : on ne révèle jamais si un email
 *  existe ou non dans le registre (anti-énumération).
 */

/**
 * Étape 1 du parcours cliente : demande d'un code de vérification.
 * Renvoie TOUJOURS le même message de succès générique, que l'email soit
 * connu ou non — seul un email réellement enregistré recevra un vrai code.
 */
function requestVerificationCode(email) {
  if (!email || String(email).indexOf('@') === -1) {
    throw new BookingBusinessError_('Adresse email invalide.');
  }
  const settings = getSettings();
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    enforceCodeRequestRateLimit_(normalizedEmail, settings);
  } catch (e) {
    if (e instanceof RateLimitError_) {
      // Réponse générique même en cas de rate limit — on ne distingue pas
      // ce cas d'un succès aux yeux du client, pour ne rien révéler.
      writeAuditLog_(normalizedEmail, 'code_request_rate_limited', normalizedEmail, '', '', '');
      return { message: GENERIC_CODE_REQUEST_MESSAGE };
    }
    throw e;
  }

  const client = findClientByEmail_(normalizedEmail);

  // Toujours écrire une ligne (même si email inconnu) pour que le timing de
  // réponse ne révèle rien — mais le mail n'est envoyé QUE si le client existe.
  const code = generateVerificationCode_();
  const codeHash = hashWithPepper_(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.verification_code_validity_minutes * 60 * 1000);

  appendRow_(TABS.VERIFICATION_CODES, {
    email: normalizedEmail,
    code_hash: codeHash,
    created_at: now,
    expires_at: expiresAt,
    used: false,
    attempts: 0,
  });

  if (client) {
    sendVerificationCodeEmail_(normalizedEmail, client.prenom, code, settings);
    writeAuditLog_(normalizedEmail, 'code_request_sent', client.client_id, '', '', '');
  } else {
    writeAuditLog_(normalizedEmail, 'code_request_unknown_email', normalizedEmail, '', '', '');
  }

  return { message: GENERIC_CODE_REQUEST_MESSAGE };
}

const GENERIC_CODE_REQUEST_MESSAGE =
  "Si cette adresse est associée à un forfait, un code de vérification vient d'être envoyé par email.";

/** Envoi du code — MailApp uniquement (scope minimal script.send_mail, aucun accès à la boîte mail). */
function sendVerificationCodeEmail_(email, prenom, code, settings) {
  const subject = 'Votre code de vérification — Elysian Paris';
  const body = [
    `Bonjour ${prenom || ''},`,
    '',
    `Voici votre code de vérification : ${code}`,
    '',
    `Ce code est valable ${settings.verification_code_validity_minutes} minutes et ne peut être utilisé qu'une seule fois.`,
    '',
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
    '',
    'Elysian Paris',
  ].join('\n');

  MailApp.sendEmail(email, subject, body);
}

/**
 * Étape 2 du parcours cliente : vérification du code saisi.
 * En cas de succès, émet un jeton de session temporaire et renvoie la liste
 * des forfaits/soins éligibles pour cette cliente (jamais l'inverse : on ne
 * renvoie rien tant que le code n'est pas validé).
 */
function verifyCodeAndIssueToken(email, codePlain) {
  const settings = getSettings();
  const normalizedEmail = String(email).trim().toLowerCase();

  enforceNotLockedOut_(normalizedEmail, settings);

  const codeRows = readAllRows_(TABS.VERIFICATION_CODES)
    .filter((r) => String(r.email).toLowerCase() === normalizedEmail && !r.used)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const latest = codeRows[0];
  const providedHash = hashWithPepper_(String(codePlain).trim());

  const isValid = latest
    && latest.code_hash === providedHash
    && new Date(latest.expires_at) > new Date();

  if (!isValid) {
    recordFailedAttempt_(normalizedEmail, settings);
    if (latest) {
      updateRow_(TABS.VERIFICATION_CODES, latest.rowNumber, { attempts: Number(latest.attempts || 0) + 1 });
    }
    writeAuditLog_(normalizedEmail, 'code_verification_failed', normalizedEmail, '', '', '');
    throw new BookingBusinessError_('Code invalide ou expiré.');
  }

  // Succès : marquer le code utilisé, réinitialiser le compteur d'échecs.
  updateRow_(TABS.VERIFICATION_CODES, latest.rowNumber, { used: true });
  clearFailedAttempts_(normalizedEmail);

  const client = findClientByEmail_(normalizedEmail);
  if (!client) {
    // Ne devrait jamais arriver (un code n'est envoyé que si le client existe),
    // mais on reste défensif et générique.
    throw new BookingBusinessError_('Vérification impossible.');
  }

  const eligiblePackages = readAllRows_(TABS.PACKAGES).filter((pkg) => {
    if (pkg.client_id !== client.client_id) return false;
    if (pkg.statut !== PACKAGE_STATUS.ACTIVE) return false;
    if (Number(pkg.available_sessions) < 1) return false;
    if (pkg.date_expiration) {
      const exp = new Date(pkg.date_expiration);
      if (!isNaN(exp.getTime()) && exp < new Date()) return false;
    }
    return true;
  });

  if (eligiblePackages.length === 0) {
    writeAuditLog_(normalizedEmail, 'no_eligible_package', client.client_id, '', '', '');
    throw new BookingBusinessError_("Aucun forfait actif avec des séances disponibles n'a été trouvé pour ce compte.");
  }

  // Un jeton par forfait éligible (le site laissera choisir le soin ; en V1,
  // on prend le premier forfait éligible s'il n'y en a qu'un, sinon le site
  // demandera lequel utiliser).
  const chosenPackage = eligiblePackages[0];
  const tokenPlain = generateSessionToken_();
  const tokenHash = hashWithPepper_(tokenPlain);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.session_token_validity_minutes * 60 * 1000);

  appendRow_(TABS.SESSION_TOKENS, {
    token_hash: tokenHash,
    client_id: client.client_id,
    package_id: chosenPackage.package_id,
    created_at: now,
    expires_at: expiresAt,
    used_for_booking_request_id: '',
  });

  writeAuditLog_(normalizedEmail, 'code_verified_token_issued', client.client_id, '', '', '');

  return {
    sessionToken: tokenPlain,
    expiresInMinutes: settings.session_token_validity_minutes,
    eligibleServices: String(chosenPackage.soins_inclus || '').split(',').map((s) => s.trim()),
    packageName: chosenPackage.nom_forfait,
    availableSessions: Number(chosenPackage.available_sessions),
  };
}
