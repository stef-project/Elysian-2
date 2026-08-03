/**
 * ============================================================================
 *  CRM.gs — Tags, historique des notes, recherche de clientes.
 * ============================================================================
 *
 *  Étend Fiche_Client (ClientProfile.gs) sans dupliquer sa logique :
 *  - `Clients.tags` : segmentation libre (VIP, à risque, nouvelle...).
 *  - `Client_Notes` : historique des notes, jamais écrasé — contrairement à
 *    `Clients.notes_admin` qui reste une note "épinglée" rapide, remplacée à
 *    chaque modification. `adminViewClientProfile` (ClientProfile.gs) affiche
 *    les deux.
 *  - Recherche/segmentation de clientes par critère, résultat dans un onglet
 *    de rapport régénéré à la demande (même principe que Fiche_Client/Dashboard).
 *
 *  Rien de nouveau côté scopes ni côté données sensibles.
 *
 *  Programme de parrainage : réutilise entièrement les tags ci-dessus (tag
 *  "referred-by:CLIENT_ID") — aucune nouvelle table. Règle fixe et explicite
 *  (contrairement aux alertes de renouvellement, qui restent une décision
 *  commerciale signalée dans Reconciliation_Issues, jamais automatique) :
 *  tous les N filleul(e)s ayant confirmé un premier achat, la marraine reçoit
 *  automatiquement une séance offerte. checkReferralMilestones_ (appelée
 *  depuis activatePackageIfPending_ dans Payments.gs) détecte le palier et
 *  déclenche grantComplimentaryPackage_ sans intervention admin.
 */

// ─────────────────────────────────────────────────────────────────────────
//  Tags
// ─────────────────────────────────────────────────────────────────────────

function parseTags_(tagsRaw) {
  return String(tagsRaw || '').split(',').map((t) => t.trim()).filter((t) => t.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────
//  Parrainage
// ─────────────────────────────────────────────────────────────────────────

/**
 * Demande (optionnellement) le prénom + nom d'une marraine et renvoie le tag
 * "referred-by:CLIENT_ID" correspondant, ou '' si non applicable/introuvable.
 * Utilisé à la création d'une cliente (adminAddClient, findOrPromptCreateClient_)
 * pour ne jamais dupliquer cette logique entre les deux points d'entrée.
 *
 * Recherche par nom (pas par email) : c'est l'information que la nouvelle
 * cliente donne spontanément ("recommandée par Untel·le"). En cas de
 * plusieurs clientes du même nom, demande le client_id exact plutôt que de
 * deviner ; si aucun nom ne correspond, propose l'email en secours.
 */
function promptReferralTag_() {
  const ui = ui_();
  const prenom = ui.prompt('Cliente recommandée par : prénom de la marraine (laisser vide si non applicable) :').getResponseText().trim();
  if (!prenom) return '';
  const nom = ui.prompt('Nom de la marraine :').getResponseText().trim();

  const matches = findClientsByName_(prenom, nom);
  let referrer = null;

  if (matches.length === 1) {
    referrer = matches[0];
  } else if (matches.length > 1) {
    const list = matches.map((c) => `${c.client_id} — ${c.prenom} ${c.nom} — ${c.email || "(pas d'email)"}`).join('\n');
    const clientIdChoice = ui.prompt(
      `Plusieurs clientes correspondent à ce nom :\n${list}\n\nSaisis le client_id exact de la marraine :`
    ).getResponseText().trim();
    referrer = findRowBy_(TABS.CLIENTS, 'client_id', clientIdChoice);
  } else {
    const emailFallback = ui.prompt('Aucune cliente trouvée avec ce nom. Email de la marraine (secours, laisser vide pour annuler) :').getResponseText().trim().toLowerCase();
    referrer = emailFallback ? findClientByEmail_(emailFallback) : null;
  }

  if (!referrer) {
    ui.alert('Aucune cliente trouvée pour ce parrainage — ignoré.');
    return '';
  }
  return REFERRAL_TAG_PREFIX + referrer.client_id;
}

/**
 * Remise de bienvenue de la cliente parrainée (la filleule) — appelée juste
 * après la création d'une cliente dont le parrainage a été enregistré
 * (adminAddClient, AdminMenu.gs / findOrPromptCreateClient_, PackageOffers.gs).
 *
 * Crée automatiquement un code promo personnel (réservé à cette cliente,
 * usage unique), avec la remise configurée dans Settings :
 *   - referral_welcome_discount_type  ('percentage' ou 'fixed_amount')
 *   - referral_welcome_discount_value (0 = programme désactivé, aucun code créé)
 *   - referral_welcome_validity_days  (durée de validité du code)
 *
 * Le code apparaît automatiquement sur le tableau de bord /use-package de la
 * cliente et dans le portail admin /admin (findActivePromoCodesForClient_),
 * et s'applique à la saisie du paiement comme n'importe quel code promo
 * (promptAndRecordPayment_) — aucune mécanique nouvelle, tout est réutilisé.
 *
 * @returns {string} le code créé (ex. "WELCOME-4FQ7"), ou '' si désactivé.
 */
function grantReferralWelcomePromo_(clientId, referralTag) {
  const settings = getSettings();
  const value = Number(settings.referral_welcome_discount_value) || 0;
  if (value <= 0) return '';

  const type = settings.referral_welcome_discount_type === PROMO_CODE_TYPE.FIXED_AMOUNT
    ? PROMO_CODE_TYPE.FIXED_AMOUNT
    : PROMO_CODE_TYPE.PERCENTAGE;
  const validityDays = Number(settings.referral_welcome_validity_days) || 90;

  const code = generateUniquePromoCode_('WELCOME');
  createPromoCode_({
    code: code,
    clientId: clientId,
    type: type,
    value: value,
    usageMax: 1,
    dateExpiration: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
    notesAdmin: `Remise de bienvenue automatique — cliente parrainée (${referralTag})`,
    actor: 'system',
  });
  return code;
}

/**
 * Appelée depuis activatePackageIfPending_ (Payments.gs) à chaque activation
 * de forfait. Compte les filleul(e)s de clientId ayant confirmé au moins un
 * paiement, et accorde automatiquement une récompense (séance(s) offerte(s))
 * tous les N parrainages réussis (règle fixe explicite, configurable dans
 * Settings — pas une simple alerte comme les autres automatismes commerciaux
 * de ce système, ici la règle elle-même est déjà décidée). Dédoublonné par
 * palier via Reminders_Sent (client_id, package_id vide, type
 * "parrainage_palier_N") pour ne jamais accorder deux fois la même récompense.
 */
function checkReferralMilestones_() {
  const settings = getSettings();
  const milestoneSize = Number(settings.referral_milestone_count) || 3;
  const payments = readAllRows_(TABS.PAYMENTS);
  const clients = readAllRows_(TABS.CLIENTS);

  // Regroupe les filleul(e)s par marraine, à partir des tags "referred-by:X".
  const referredByReferrer = {};
  clients.forEach((c) => {
    const tag = parseTags_(c.tags).find((t) => t.indexOf(REFERRAL_TAG_PREFIX) === 0);
    if (!tag) return;
    const referrerId = tag.slice(REFERRAL_TAG_PREFIX.length);
    if (!referredByReferrer[referrerId]) referredByReferrer[referrerId] = [];
    referredByReferrer[referrerId].push(c.client_id);
  });

  Object.keys(referredByReferrer).forEach((referrerId) => {
    // "Converti" = au moins un paiement RÉEL confirmé — un forfait offert
    // (complimentary, y compris une récompense de parrainage elle-même) ne
    // compte jamais comme une conversion.
    const convertedCount = referredByReferrer[referrerId].filter((cid) =>
      payments.some((p) =>
        p.client_id === cid &&
        p.statut_paiement === PAYMENT_STATUS.CONFIRME &&
        p.moyen_paiement !== PAYMENT_METHOD.COMPLIMENTARY
      )
    ).length;

    if (convertedCount === 0 || convertedCount % milestoneSize !== 0) return;

    const milestoneType = `parrainage_palier_${convertedCount}`;
    if (hasReminderBeenSent_(referrerId, '', milestoneType)) return;

    const referrer = findRowBy_(TABS.CLIENTS, 'client_id', referrerId);
    if (!referrer) return;

    grantComplimentaryPackage_(
      referrerId,
      settings.referral_reward_label,
      Number(settings.referral_reward_sessions) || 1,
      `Récompense automatique de parrainage : ${convertedCount}e filleul(e) ayant confirmé un premier achat.`
    );
    recordReminderSent_(referrerId, '', milestoneType);

    if (referrer.email) {
      MailApp.sendEmail(
        referrer.email,
        'A free session, on us — thank you for your referrals!',
        [
          `Hi ${referrer.prenom || ''},`,
          '',
          `Thank you for referring ${convertedCount} friend(s) to Elysian Paris!`,
          `As a thank you, we've added ${Number(settings.referral_reward_sessions) || 1} complimentary session(s) to your account.`,
          '',
          'Book it whenever suits you — see you soon.',
          '',
          'Elysian Paris',
        ].join('\n')
      );
    }
  });
}

function adminAddClientTag() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Cliente introuvable.'); return; }

  const tagToAdd = ui.prompt('Tag à ajouter (ex. vip, a-risque, nouvelle) :').getResponseText().trim().toLowerCase();
  if (!tagToAdd) { ui.alert('Tag vide, opération annulée.'); return; }

  const tags = parseTags_(client.tags);
  if (tags.indexOf(tagToAdd) !== -1) { ui.alert(`Cette cliente a déjà le tag "${tagToAdd}".`); return; }

  tags.push(tagToAdd);
  updateRow_(TABS.CLIENTS, client.rowNumber, { tags: tags.join(', ') });
  writeAuditLog_('admin', 'add_client_tag', client.client_id, client.tags || '', tags.join(', '), '');
  ui.alert(`Tag "${tagToAdd}" ajouté. Tags actuels : ${tags.join(', ')}`);
}

function adminRemoveClientTag() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Cliente introuvable.'); return; }

  const tags = parseTags_(client.tags);
  if (tags.length === 0) { ui.alert('Cette cliente n\'a aucun tag.'); return; }

  const tagToRemove = ui.prompt(`Tags actuels : ${tags.join(', ')}\n\nTag à retirer :`).getResponseText().trim().toLowerCase();
  const newTags = tags.filter((t) => t !== tagToRemove);
  if (newTags.length === tags.length) { ui.alert(`Tag "${tagToRemove}" introuvable sur cette cliente.`); return; }

  updateRow_(TABS.CLIENTS, client.rowNumber, { tags: newTags.join(', ') });
  writeAuditLog_('admin', 'remove_client_tag', client.client_id, tags.join(', '), newTags.join(', '), '');
  ui.alert(`Tag "${tagToRemove}" retiré. Tags actuels : ${newTags.join(', ') || '(aucun)'}`);
}

// ─────────────────────────────────────────────────────────────────────────
//  Historique des notes
// ─────────────────────────────────────────────────────────────────────────

function findClientNotes_(clientId) {
  return readAllRows_(TABS.CLIENT_NOTES)
    .filter((n) => n.client_id === clientId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function adminAddClientNote() {
  const ui = ui_();
  const email = ui.prompt('Email de la cliente :').getResponseText().trim().toLowerCase();
  const client = findClientByEmail_(email);
  if (!client) { ui.alert('Cliente introuvable.'); return; }

  const note = ui.prompt('Note à ajouter à l\'historique :').getResponseText().trim();
  if (!note) { ui.alert('Note vide, opération annulée.'); return; }

  appendRow_(TABS.CLIENT_NOTES, {
    note_id: genId_('NOTE'),
    client_id: client.client_id,
    timestamp: new Date(),
    auteur: Session.getActiveUser().getEmail() || 'admin',
    note: note,
  });
  writeAuditLog_('admin', 'add_client_note', client.client_id, '', note, '');
  ui.alert('Note ajoutée à l\'historique.');
}

// ─────────────────────────────────────────────────────────────────────────
//  Recherche / segmentation de clientes
// ─────────────────────────────────────────────────────────────────────────

/** Date du dernier paiement confirmé d'une cliente, ou null si aucun. */
function findLastConfirmedPaymentDate_(clientId, payments) {
  const clientPayments = payments
    .filter((p) => p.client_id === clientId && p.statut_paiement === PAYMENT_STATUS.CONFIRME)
    .map((p) => new Date(p.date_paiement))
    .filter((d) => !isNaN(d.getTime()));
  if (clientPayments.length === 0) return null;
  return new Date(Math.max.apply(null, clientPayments));
}

function adminSearchClients() {
  const ui = ui_();
  const criteria = ui.prompt(
    'Critère de recherche :\n' +
    '- "tag:<nom>" (ex. tag:vip)\n' +
    '- "sans_achat:<jours>" (aucun paiement confirmé depuis N jours, ou jamais)\n' +
    '- "expiration:<jours>" (forfait actif expirant dans ≤ N jours)\n' +
    '- "source:<valeur>" (ex. source:classpass — d\'après Bookings.source)'
  ).getResponseText().trim().toLowerCase();

  const [type, argRaw] = criteria.split(':').map((s) => s.trim());
  const clients = readAllRows_(TABS.CLIENTS);
  const packages = readAllRows_(TABS.PACKAGES);
  const payments = readAllRows_(TABS.PAYMENTS);
  const bookings = readAllRows_(TABS.BOOKINGS);
  const now = new Date();
  let matched = [];
  let label = '';

  if (type === 'tag') {
    label = `Tag = "${argRaw}"`;
    matched = clients.filter((c) => parseTags_(c.tags).indexOf(argRaw) !== -1);
  } else if (type === 'sans_achat') {
    const days = parseInt(argRaw, 10);
    if (isNaN(days)) { ui.alert('Nombre de jours invalide.'); return; }
    label = `Aucun paiement confirmé depuis ≥ ${days} jours (ou jamais)`;
    matched = clients.filter((c) => {
      const lastDate = findLastConfirmedPaymentDate_(c.client_id, payments);
      if (!lastDate) return true;
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
      return daysSince >= days;
    });
  } else if (type === 'expiration') {
    const days = parseInt(argRaw, 10);
    if (isNaN(days)) { ui.alert('Nombre de jours invalide.'); return; }
    label = `Forfait actif expirant dans ≤ ${days} jours`;
    const clientIdsNearExpiry = new Set(
      packages.filter((p) => {
        if (p.statut !== PACKAGE_STATUS.ACTIVE || !p.date_expiration) return false;
        const exp = new Date(p.date_expiration);
        if (isNaN(exp.getTime())) return false;
        const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        return daysUntil >= 0 && daysUntil <= days;
      }).map((p) => p.client_id)
    );
    matched = clients.filter((c) => clientIdsNearExpiry.has(c.client_id));
  } else if (type === 'source') {
    label = `Source de réservation = "${argRaw}"`;
    const clientIdsWithSource = new Set(
      bookings.filter((b) => b.source === argRaw).map((b) => b.client_id)
    );
    matched = clients.filter((c) => clientIdsWithSource.has(c.client_id));
  } else {
    ui.alert('Critère invalide. Utilise le format "type:valeur" (ex. tag:vip).');
    return;
  }

  const rows = [
    [`Recherche : ${label} — ${matched.length} résultat(s)`, '', '', '', ''],
    ['client_id', 'prenom', 'nom', 'email', 'telephone'],
    ...matched.map((c) => [c.client_id, c.prenom, c.nom, c.email, c.telephone]),
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TABS.CLIENT_SEARCH_RESULTS);
  if (!sheet) {
    sheet = ss.insertSheet(TABS.CLIENT_SEARCH_RESULTS);
  }
  sheet.clear();
  sheet.getRange(1, 1, rows.length, 5).setValues(rows);
  sheet.autoResizeColumns(1, 5);
  ss.setActiveSheet(sheet);

  ui.alert(`${matched.length} cliente(s) trouvée(s), résultat dans l'onglet "${TABS.CLIENT_SEARCH_RESULTS}".`);
}
