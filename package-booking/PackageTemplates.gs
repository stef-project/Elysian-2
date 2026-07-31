/**
 * ============================================================================
 *  PACKAGETEMPLATES.gs — Catalogue de forfaits (Phase 2, Étape A).
 * ============================================================================
 *
 *  Un modèle ("template") définit les conditions par défaut d'un forfait :
 *  nom, soins inclus, nombre de séances, prix, durée de validité. Quand un
 *  forfait est attribué à une cliente (adminAddPackage, AdminMenu.gs), les
 *  valeurs du modèle sont COPIÉES dans la ligne Packages au moment de
 *  l'attribution — une modification ultérieure du modèle ne change jamais
 *  rétroactivement les forfaits déjà attribués.
 *
 *  Catégories limitées à 3 au lancement : decouverte / principal / premium.
 *  Un modèle 'premium' peut être marqué visibilite='private' : il n'est
 *  jamais publié sur le site et reste proposable uniquement par
 *  l'administratrice via "Proposer un forfait" (Étape B).
 *
 *  ⚠️ Aucun de ces modèles n'est jamais publié sur le site tant que
 *  l'administratrice ne l'a pas explicitement demandé — ce fichier ne
 *  touche à aucune route publique ni à WebApp.gs.
 */

function findPackageTemplateById_(templateId) {
  return findRowBy_(TABS.PACKAGE_TEMPLATES, 'package_template_id', templateId);
}

/** Modèles actifs, triés par ordre_affichage croissant. Utilisé par "Proposer un forfait" (Étape B). */
function listActivePackageTemplates_() {
  return readAllRows_(TABS.PACKAGE_TEMPLATES)
    .filter((t) => t.statut === PACKAGE_TEMPLATE_STATUS.ACTIVE)
    .sort((a, b) => Number(a.ordre_affichage || 0) - Number(b.ordre_affichage || 0));
}

function adminAddPackageTemplate() {
  const ui = ui_();
  const nom = ui.prompt('Nom du forfait (ex. "Découverte Drainage 3 séances") :').getResponseText().trim();
  if (!nom) { ui.alert('Nom obligatoire, opération annulée.'); return; }

  const description = ui.prompt('Description (visible cliente si publié un jour) :').getResponseText().trim();
  const soinsInclus = ui.prompt('Soins inclus, séparés par des virgules (ex. lymphatic-1z, maderotherapy) :').getResponseText().trim();
  const nombreSeancesRaw = ui.prompt('Nombre de séances :').getResponseText().trim();
  const nombreSeances = parseInt(nombreSeancesRaw, 10);
  if (isNaN(nombreSeances) || nombreSeances <= 0) { ui.alert('Nombre de séances invalide.'); return; }

  const prixPublicRaw = ui.prompt('Prix public (nombre, ex. 350) :').getResponseText().trim();
  const prixPublic = parseFloat(prixPublicRaw);
  if (isNaN(prixPublic) || prixPublic < 0) { ui.alert('Prix invalide.'); return; }

  const dureeValiditeRaw = ui.prompt('Durée de validité en jours (ex. 180), laisser vide si aucune :').getResponseText().trim();
  const dureeValidite = dureeValiditeRaw ? parseInt(dureeValiditeRaw, 10) : '';

  const categorieRaw = ui.prompt('Catégorie : "decouverte" / "principal" / "premium" :').getResponseText().trim().toLowerCase();
  if (Object.values(PACKAGE_TEMPLATE_CATEGORY).indexOf(categorieRaw) === -1) {
    ui.alert('Catégorie invalide (decouverte / principal / premium).');
    return;
  }

  let visibilite = PACKAGE_TEMPLATE_VISIBILITY.PRIVATE;
  if (categorieRaw === PACKAGE_TEMPLATE_CATEGORY.PREMIUM) {
    ui.alert('Catégorie "premium" : ce modèle reste privé (jamais publié, proposé uniquement par toi).');
  } else {
    const visibiliteAnswer = ui.alert(
      'Ce modèle pourra-t-il un jour être publié publiquement sur le site (une fois validé) ?\n\n' +
      'Choisir NON si tu n\'es pas certaine — cela reste modifiable plus tard.',
      ui.ButtonSet.YES_NO
    );
    visibilite = visibiliteAnswer === ui.Button.YES
      ? PACKAGE_TEMPLATE_VISIBILITY.PUBLIC
      : PACKAGE_TEMPLATE_VISIBILITY.PRIVATE;
  }

  const ordreAffichageRaw = ui.prompt('Ordre d\'affichage (nombre, ex. 1, 2, 3...) :').getResponseText().trim();
  const ordreAffichage = parseInt(ordreAffichageRaw, 10) || 0;
  const notesInternes = ui.prompt('Notes internes (optionnel) :').getResponseText().trim();

  const templateId = genId_('TPL');
  appendRow_(TABS.PACKAGE_TEMPLATES, {
    package_template_id: templateId,
    nom, description,
    soins_inclus: soinsInclus,
    nombre_seances: nombreSeances,
    prix_public: prixPublic,
    duree_validite_jours: dureeValidite,
    categorie: categorieRaw,
    visibilite,
    statut: PACKAGE_TEMPLATE_STATUS.ACTIVE,
    ordre_affichage: ordreAffichage,
    notes_internes: notesInternes,
  });
  writeAuditLog_('admin', 'add_package_template', templateId, '', nom, '');
  ui.alert(`Modèle de forfait créé : ${templateId} (${visibilite === PACKAGE_TEMPLATE_VISIBILITY.PRIVATE ? 'privé' : 'publiable'}).`);
}

/** Rappel : jamais rétroactif — ne modifie que le modèle, pas les forfaits déjà attribués (voir en-tête du fichier). */
function adminEditPackageTemplate() {
  const ui = ui_();
  const templateId = ui.prompt('package_template_id à modifier :').getResponseText().trim();
  const tpl = findPackageTemplateById_(templateId);
  if (!tpl) { ui.alert('Modèle introuvable.'); return; }

  ui.alert(
    `Modèle actuel :\nNom : ${tpl.nom}\nSoins : ${tpl.soins_inclus}\nSéances : ${tpl.nombre_seances}\n` +
    `Prix : ${tpl.prix_public}\nValidité (jours) : ${tpl.duree_validite_jours}\nCatégorie : ${tpl.categorie}\n` +
    `Visibilité : ${tpl.visibilite}\nStatut : ${tpl.statut}\nOrdre : ${tpl.ordre_affichage}`
  );

  const field = ui.prompt(
    'Quel champ modifier ? (nom / description / soins_inclus / nombre_seances / prix_public / ' +
    'duree_validite_jours / ordre_affichage / notes_internes)'
  ).getResponseText().trim();
  const editableFields = [
    'nom', 'description', 'soins_inclus', 'nombre_seances', 'prix_public',
    'duree_validite_jours', 'ordre_affichage', 'notes_internes',
  ];
  if (editableFields.indexOf(field) === -1) { ui.alert('Champ invalide ou non modifiable ici.'); return; }

  const newValueRaw = ui.prompt(`Nouvelle valeur pour ${field} (actuelle : ${tpl[field]}) :`).getResponseText().trim();
  let newValue = newValueRaw;
  if (['nombre_seances', 'duree_validite_jours', 'ordre_affichage'].indexOf(field) !== -1) {
    newValue = parseInt(newValueRaw, 10);
  } else if (field === 'prix_public') {
    newValue = parseFloat(newValueRaw);
  }

  const motif = ui.prompt('Motif de la modification (obligatoire) :').getResponseText().trim();
  if (!motif) { ui.alert('Motif obligatoire, opération annulée.'); return; }

  const updates = {};
  updates[field] = newValue;
  updateRow_(TABS.PACKAGE_TEMPLATES, tpl.rowNumber, updates);
  writeAuditLog_('admin', 'edit_package_template', templateId, `${field}=${tpl[field]}`, `${field}=${newValue}`, motif);
  ui.alert('Modèle mis à jour. Les forfaits déjà attribués ne sont pas affectés (copie figée à l\'achat).');
}

function adminSetPackageTemplateStatus() {
  const ui = ui_();
  const templateId = ui.prompt('package_template_id à activer/désactiver :').getResponseText().trim();
  const tpl = findPackageTemplateById_(templateId);
  if (!tpl) { ui.alert('Modèle introuvable.'); return; }

  const newStatus = tpl.statut === PACKAGE_TEMPLATE_STATUS.ACTIVE
    ? PACKAGE_TEMPLATE_STATUS.INACTIVE
    : PACKAGE_TEMPLATE_STATUS.ACTIVE;
  updateRow_(TABS.PACKAGE_TEMPLATES, tpl.rowNumber, { statut: newStatus });
  writeAuditLog_('admin', 'set_package_template_status', templateId, tpl.statut, newStatus, '');
  ui.alert(`Modèle "${tpl.nom}" maintenant : ${newStatus}.`);
}
