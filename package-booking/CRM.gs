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
 */

// ─────────────────────────────────────────────────────────────────────────
//  Tags
// ─────────────────────────────────────────────────────────────────────────

function parseTags_(tagsRaw) {
  return String(tagsRaw || '').split(',').map((t) => t.trim()).filter((t) => t.length > 0);
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
