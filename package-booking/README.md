# Réservation par forfait — Elysian Paris

Système de réservation en ligne pour les clientes disposant déjà d'un
forfait prépayé, **sans repaiement**, sans redirection vers un lien Google
non protégé. La logique tourne entièrement dans Google Apps Script, l'état
dans un Google Sheet dédié.

> 🔒 **Séparé de `gmail-automation/`.** Ce projet ne partage aucun fichier,
> aucune donnée, aucune autorisation avec l'automatisation de tri des
> emails existante. Les deux peuvent tourner indépendamment.

> ⚠️ **Ne remplace rien d'existant.** Les 6 Appointment Schedules payants
> (Stripe via Google Calendar) restent inchangés pour les nouvelles
> clientes / celles sans forfait valide.

---

## 1. Créer le Google Sheet

1. Va sur **sheets.google.com** → crée un nouveau classeur.
2. Renomme-le : `Elysian — Forfaits & Réservations`.
3. **Extensions → Apps Script** — ça ouvre l'éditeur, lié à ce Sheet.

## 2. Copier les fichiers de ce dossier

**Option rapide (recommandée) :** crée un seul fichier `TOUT-EN-UN.gs` dans
l'éditeur Apps Script et colle-y tout le contenu de
[`TOUT-EN-UN.gs`](./TOUT-EN-UN.gs) de ce dossier — il regroupe les 18 fichiers
ci-dessous (mêmes fonctions, même comportement) en un seul copier-coller,
comme pour `gmail-automation/TOUT-EN-UN.gs`. Tu peux supprimer le fichier
`Code.gs` par défaut.

⚠️ Si un fichier a été ajouté/modifié directement dans l'éditeur Apps Script
sans passer par ce dépôt (ex. via une automatisation de navigateur), il est
recommandé de **tout remplacer** par le contenu à jour de `TOUT-EN-UN.gs`
plutôt que de fusionner à la main — sélectionne tout (Ctrl+A) dans chaque
fichier concerné avant de coller, pour repartir d'un état propre et connu.

**Option détaillée (équivalente, fichier par fichier) :** pour chaque fichier
`.gs` de `package-booking/`, crée un fichier du même nom dans l'éditeur Apps
Script (icône **+** à côté de "Fichiers" → Script) et colle son contenu :

- `Constants.gs`
- `Settings.gs`
- `SheetSchema.gs`
- `Security.gs`
- `DataAccess.gs`
- `Availability.gs`
- `Booking.gs`
- `PackageVerification.gs`
- `AdminMenu.gs`
- `Reconciliation.gs`
- `WebApp.gs`
- `PackageTemplates.gs` (Phase 2, Étape A)
- `Payments.gs` (Phase 2, Étape A)
- `ClientProfile.gs` (Phase 2, Étape A)
- `PackageOffers.gs` (Phase 2, Étape B)
- `Notifications.gs` (Phase 2, Étape C)
- `Dashboard.gs` (Phase 2, Étape C)
- `CRM.gs` (tags, historique des notes, recherche de clientes)

Puis le **manifeste** : icône ⚙️ **Paramètres du projet** → coche **"Afficher
le fichier manifeste appsscript.json dans l'éditeur"** → remplace son
contenu par celui de `appsscript.json` de ce dossier.

## 3. Initialiser les onglets (une seule fois)

1. Menu déroulant des fonctions (en haut) → choisis **`initializeSheets`**.
2. ▶️ **Exécuter**.
3. Autorise l'accès demandé (voir section Autorisations ci-dessous).
4. Va dans le Sheet → onglet **`Settings`** → renseigne au minimum
   **`calendar_id`** (voir étape 4). Sans ça, rien ne fonctionnera.

## 4. Créer le calendrier dédié

**Recommandé** : ne réutilise pas ton calendrier personnel.

1. Google Calendar → **"Autres agendas" → "+" → "Créer un agenda"**.
2. Nomme-le `Elysian – Réservations forfaits`.
3. Paramètres de cet agenda → **"Intégrer l'agenda"** → copie **l'ID de
   l'agenda** (ressemble à `xxxxxxxx@group.calendar.google.com`).
4. Colle cet ID dans l'onglet `Settings` du Sheet, ligne `calendar_id`.

> ⚠️ Si tes Appointment Schedules payants utilisent un autre calendrier, les
> créneaux ne seront pas partagés entre les deux systèmes et des doubles
> réservations resteront possibles. Dis-moi quel calendrier ils utilisent
> réellement — on ajustera `calendar_id` en conséquence, quitte à ce que ce
> soit le même calendrier pour les deux systèmes.

## 5. Autorisations demandées — pourquoi

| Scope | Pourquoi |
|---|---|
| `calendar` (lecture + écriture) | Lire les créneaux libres et créer les événements confirmés |
| `spreadsheets.currentonly` | Lire/écrire **uniquement ce Sheet précis** (pas accès à tes autres Sheets) |
| `script.send_mail` | Envoyer le code de vérification par email — **envoi seul**, aucun accès à ta boîte de réception (différent de `gmail-automation/` qui lit les emails) |

L'avertissement **"application non vérifiée"** est normal pour un script
personnel que toi (via moi) avez écrit — choisis ton compte → "Paramètres
avancés" → "Accéder à (projet)" → Autoriser.

## 6. Tester avant de déployer

1. Ajoute-toi comme cliente test : menu **Elysian Admin → Ajouter une
   cliente** (utilise une adresse email à laquelle tu as accès).
2. Ajoute-toi un forfait test : **Elysian Admin → Ajouter un forfait**
   (ex. 2 séances, soin `lymphatic-1z`).
3. Dans l'éditeur, lance manuellement `requestVerificationCode("tonemail@...")`
   depuis une fonction de test, ou attends l'intégration au site (étape 8).
4. Vérifie que l'email avec le code arrive bien.

## 7. Déployer en Web App

1. **Déployer → Nouveau déploiement**.
2. Type : **Application Web**.
3. "Exécuter en tant que" : **Moi** (ton compte). "Qui a accès" : **Tout le
   monde** (nécessaire — les clientes n'ont pas de compte Google).
4. **Déployer** → copie l'**URL de la Web App** générée.
5. **Donne-moi cette URL** — je l'intègre dans le site (constante dédiée,
   jamais codée en dur ailleurs).

### Désactiver immédiatement en cas de besoin
Déployer → Gérer les déploiements → déploiement actif → icône crayon →
Statut de la version → **Archiver** (ou supprimer le déploiement). Effet
immédiat : la Web App cesse de répondre.

### Remplacer l'URL (rotation)
Créer un **nouveau déploiement** (pas juste éditer l'ancien) → récupérer la
nouvelle URL → me la transmettre pour mise à jour du site → **puis
seulement** archiver l'ancien déploiement, pour éviter une coupure pendant
la bascule.

## 8. Activer la réconciliation quotidienne

Éditeur Apps Script → icône ⏰ **Déclencheurs** → **Ajouter un déclencheur** :
- Fonction : `runReconciliationCheck`
- Type d'événement : **Basé sur le temps** → **Minuteries jour** → une plage
  horaire creuse (ex. 3h–4h du matin).

Les anomalies détectées apparaissent dans l'onglet `Reconciliation_Issues`.
La réconciliation purge aussi les lignes périmées de `Verification_Codes`
et `Session_Tokens` (expirées depuis plus de 7 jours) — sans ça, ces
onglets grossissent à chaque demande de code et ralentissent le parcours
cliente ; l'`Audit_Log` conserve la trace de chaque demande.

## 9. Utilisation quotidienne (menu Elysian Admin)

Une fois le Sheet ouvert, un menu **"Elysian Admin"** apparaît dans la barre
(à côté d'Aide) avec toutes les actions : ajouter cliente/forfait, ajuster
un solde (motif obligatoire), marquer une séance utilisée/restaurer,
reporter/annuler un rendez-vous (règles automatiques ≥24h / <24h /
no-show / annulation institut), prolonger/suspendre un forfait.

Chaque action est tracée dans l'onglet `Audit_Log`.

---

## Phase 2, Étape A — catalogue de forfaits, paiements, fiche cliente

Ajouté après la V1, **entièrement côté administration** (menu Sheet
uniquement) : **aucune nouvelle route publique, aucun nouveau scope Google,
rien d'exposé sur le site.** Rien ne compromet la réservation par forfait
V1 — voir le détail des vérifications plus bas.

### Catalogue de forfaits (`Package_Templates`)
Sous-menu **Elysian Admin → Catalogue de forfaits** : créer/modifier un
modèle (nom, soins, séances, prix, validité, catégorie
`decouverte`/`principal`/`premium`, visibilité `public`/`private`),
activer/désactiver. Un modèle `premium` reste `private` par défaut — jamais
publié, proposable uniquement par toi. **Modifier un modèle ne change
jamais rétroactivement** les forfaits déjà attribués : leurs valeurs sont
copiées au moment de l'attribution (`adminAddPackage`), pas référencées en
direct.

### ⚠️ Changement de comportement V1 : les forfaits ne s'activent plus seuls
`adminAddPackage` (menu **Ajouter un forfait**) peut maintenant sourcer un
modèle du catalogue (`package_template_id`, optionnel — la saisie manuelle
reste possible comme avant). Le forfait créé démarre **toujours** au statut
`pending_payment` et **n'est pas réservable** tant qu'un paiement n'a pas
été enregistré/confirmé (`findEligiblePackages_` et `confirmPackageBooking`
exigent toujours `statut === active`, inchangés). Juste après la création,
deux parcours au choix (question oui/non posée directement dans le flux) :

1. **Paiement à recevoir** — le forfait reste `pending_payment`. Utiliser
   plus tard **Elysian Admin → Paiements → Enregistrer un paiement** pour
   l'activer une fois le paiement reçu.
2. **Paiement déjà reçu / forfait historique** — la saisie du paiement
   (moyen, montant brut, frais, référence) se fait immédiatement dans la
   foulée, et le forfait passe à `active` tout de suite. Couvre : forfait
   déjà payé historiquement, Revolut déjà reçu, virement déjà reçu, carte
   sur place, espèces, ClassPass, offert, autre paiement externe.

Pour un **forfait offert** (`complimentary`), le montant brut et les frais
sont automatiquement fixés à `0`, et un motif devient **obligatoire**
(comme pour `cash`/`other` — moyens peu traçables). Dans tous les cas,
**aucun forfait n'est jamais activé sans une ligne `Payments`** (trace de
paiement) — la logique de saisie/calcul est centralisée dans
`promptAndRecordPayment_` (`Payments.gs`), réutilisée par les deux
parcours ci-dessus et par "Enregistrer un paiement" : rien n'est dupliqué.

### Paiements (`Payments`)
Sous-menu **Elysian Admin → Paiements** : enregistrer un paiement (brut,
devise, moyen — Revolut card/Revolut Pay/virement/Stripe/ClassPass/carte en
personne/espèces/complimentaire/autre —, frais, référence), avec calcul
automatique du net et du taux de frais réel
(`taux_frais = frais_paiement / montant_brut`). Confirmer un paiement en
attente (ex. virement arrivé plus tard) active automatiquement le forfait
lié. **Aucune confirmation automatique de paiement n'existe** dans ce
dépôt — pas d'intégration API Revolut/Stripe/ClassPass ici (Stripe reste
dans Google Workspace, hors de ce projet) : toute confirmation est
manuelle, faite par toi.

### Fiche cliente consolidée (`Fiche_Client`)
**Elysian Admin → Fiche cliente → Voir la fiche consolidée d'une cliente** :
génère un rapport dans l'onglet `Fiche_Client` (identité, forfaits actifs/en
attente/passés, rendez-vous passés et futurs, annulations/reports/no-shows,
paiements avec totaux brut/frais/net). Aucune donnée médicale ou de santé
n'y est stockée.

**Elysian Admin → Fiche cliente → Ajouter une réservation manuelle
(ClassPass / WhatsApp)** : saisie purement déclarative pour que ces
réservations apparaissent dans la fiche cliente — ne crée aucun événement
Calendar, ne touche aucun compteur de forfait. **Aucune synchronisation
ClassPass automatique n'existe** : ClassPass n'expose pas d'API accessible
identifiée à ce jour, donc uniquement de la saisie manuelle pour l'instant.

### Rendez-vous forfait ajoutés manuellement (`Ajouter un rendez-vous forfait`)
Sous-menu **Elysian Admin → Rendez-vous forfait** : crée un rendez-vous pour
une cliente qui a déjà un forfait actif (ex. après un échange WhatsApp),
avec **exactement le même cœur transactionnel sécurisé** que la réservation
en self-service (verrou, idempotence, re-vérification complète du forfait
et du créneau, restauration automatique en cas d'échec Calendar) — la
logique n'est pas dupliquée, elle est partagée (`createNewPackageBooking_`,
`Booking.gs`). Recherche la cliente par téléphone (ou email en secours) ;
si plusieurs clientes correspondent, demande une sélection manuelle
explicite plutôt que de deviner. Vérifie forfait actif, non expiré, soin
inclus, séance disponible, créneau libre, absence de doublon (même
cliente/soin/horaire/forfait déjà `pending`/`confirmed`), et que le
calendrier configuré est bien accessible — **avant** toute écriture. Le
rendez-vous créé est un `Booking` normal : report/annulation/no-show
utilisent exactement les mêmes règles administrateur que pour toute autre
réservation.

**Un événement ajouté directement dans Google Calendar (en dehors de cette
fonction) ne déduit jamais de séance automatiquement.** Pour un rendez-vous
déjà présent dans Calendar qu'il faut relier après coup à un forfait :
**Elysian Admin → Rendez-vous forfait → Associer un événement Calendar
existant à un forfait** — liste les événements non associés d'une journée
donnée, demande une confirmation explicite avant de déduire une séance.
Ne devine jamais automatiquement qu'un événement appartient à un forfait.

### Proposer un forfait (`Package_Offers`) — Phase 2, Étape B
Sous-menu **Elysian Admin → Offres de forfait** :

- **Proposer un forfait** : recherche/crée la cliente, sélectionne un modèle
  du catalogue (ou saisie manuelle), permet d'ajuster séances/prix/validité,
  choisit le moyen de paiement proposé (informatif) et la durée de validité
  **du lien**. Génère un jeton aléatoire, n'en stocke que le hash HMAC
  (`hashWithPepper_`, réutilisé de Security.gs) — le lien complet
  (`/offer/{offer_id}?token=...`) n'est affiché **qu'une seule fois**, dans
  une petite fenêtre avec un champ à copier, jamais récupérable ensuite.
- **Marquer une offre comme envoyée** : pour une offre restée `draft`.
- **Convertir une offre acceptée en forfait** : n'autorise la conversion que
  si l'offre est `accepted` (ou dérogation motivée), vérifie qu'elle n'a
  **jamais déjà été convertie** (`package_id_resultant` vide), le tout à
  l'intérieur d'un verrou pour fermer toute fenêtre de double-conversion en
  cas de double-clic. Réutilise ensuite exactement le même flux de paiement
  qu'`adminAddPackage` (`promptAndRecordPayment_`) — le forfait créé reste
  `pending_payment` tant que le paiement n'est pas confirmé.
- **Annuler une offre** : motif obligatoire.

**Consulter ou accepter le lien ne crée jamais de forfait et ne débite
jamais rien** — statuts `draft → sent → viewed → accepted/declined`
uniquement. Le statut ne passe à `paid` qu'automatiquement, en conséquence
de l'activation réelle du forfait lié (paiement confirmé) — jamais parce
que la cliente a ouvert ou accepté le lien.

Le passage `sent/draft → viewed` se fait **côté serveur uniquement**
(`getOfferDetails`, appelé par la page `/offer/:offerId` avant tout
affichage) — jamais côté navigateur seul, pour qu'un lien expiré ou déjà
répondu ne puisse jamais rester visible depuis un cache. L'expiration du
lien est vérifiée à chaque accès, et une passe de sécurité supplémentaire
tourne dans la réconciliation quotidienne (`runReconciliationCheck`).

Route `/offer/:offerId` gardée derrière son propre feature flag
`VITE_PACKAGE_OFFER_ENABLED=false` par défaut (indépendant de
`VITE_PACKAGE_BOOKING_ENABLED`) — à activer uniquement après tests, comme
pour `/use-package`.

### Confirmation, rappels, tableau de bord — Phase 2, Étape C

**Confirmation post-achat** : envoyée automatiquement dès qu'un forfait
passe à `active` (hook dans `activatePackageIfPending_`, Payments.gs — un
seul endroit décide de l'activation, donc la confirmation part toujours au
bon moment, quel que soit le parcours d'origine : `adminAddPackage`,
`adminConvertOfferToPackage`, ou confirmation différée d'un paiement).
Contient nom du forfait, séances achetées, date d'expiration, lien pour
réserver, règle d'annulation.

**Rappels de solde et d'expiration** (`Elysian Admin → Notifications &
Tableau de bord → Lancer les notifications quotidiennes maintenant`, ou
automatiquement via le déclencheur horaire) : seuils configurables dans
`Settings` (`reminder_low_balance_thresholds`, défaut `3,1,0` séances ;
`reminder_days_before_expiration`, défaut `30,14,7` jours). Chaque rappel
envoyé est enregistré dans `Reminders_Sent` — **jamais renvoyé deux fois**
pour la même combinaison (client, forfait, type de rappel), y compris entre
deux exécutions du déclencheur quotidien.

**Alerte de renouvellement** : **jamais un email automatique à la
cliente.** Quand un forfait est presque terminé (≤1 séance) ou proche de
l'expiration, une ligne est ajoutée à `Reconciliation_Issues` (statut
`a_verifier`, type `renewal_opportunity`) — à toi de décider si tu proposes
un renouvellement (via "Proposer un forfait", qui respecte lui-même le
consentement marketing de la cliente). Une seule alerte par forfait, pas de
répétition quotidienne du même signal.

**Distinction volontaire** : confirmation post-achat + rappels de
solde/expiration sont des communications **transactionnelles** sur un
service déjà acheté — toujours envoyées, indépendamment de
`Clients.consentement_marketing`. Seule une proposition de renouvellement
(commerciale) respecte ce consentement, et jamais automatiquement.

**Demande d'avis (systématisation)** : envoyée automatiquement, une seule
fois par forfait, `Settings.review_request_days_after_first_session`
(défaut `7`) jours après le premier rendez-vous honoré du forfait (tous
statuts de forfait confondus). Contrairement aux communications
transactionnelles ci-dessus, demander un avis public reste discrétionnaire
: elle **respecte `Clients.consentement_marketing`** (voir
`hasMarketingConsent_`, valeurs reconnues : `oui`/`yes`/`true`/`1`) et ne
part **jamais** si `Settings.google_review_link` est vide — à renseigner
directement dans l'onglet `Settings` une fois le lien d'avis Google
obtenu.

**Tableau de bord** (`Elysian Admin → Notifications & Tableau de bord →
Générer le tableau de bord`) : génère l'onglet `Dashboard` avec les 12
indicateurs (offres proposées/vendues, taux de conversion, CA brut/frais/
net, forfaits actifs, séances encore dues, forfaits proches de
l'expiration, clientes ClassPass, conversion ClassPass → forfait, et
depuis l'extension parrainage/promo : clientes parrainées, filleules
converties, codes promo utilisables, utilisations de codes) — chaque
indicateur liste les `id` concernés en dessous pour rester actionnable, pas
juste un chiffre. Onglet de rapport régénéré à la demande, comme
`Fiche_Client`.

⚠️ "Clientes provenant de ClassPass" est calculé à partir des réservations
`Bookings.source = classpass` (saisies manuelles, "Ajouter une réservation
manuelle") — pas à partir de `Clients.origine_premiere_reservation`, un
champ libre qui reste à renseigner à la main s'il doit être utilisé.

### Reporting opérationnel (historique + comparaison période/période)

Chaque génération du tableau de bord ajoute aussi une ligne à l'onglet
`Dashboard_History` (une vraie table, contrairement à `Dashboard` qui est
un rapport texte régénéré à chaque fois) — de quoi suivre une tendance dans
le temps. Tu peux créer un graphique natif dessus : sélectionne les
colonnes qui t'intéressent → **Insertion → Graphique**.

Le rapport `Dashboard` inclut aussi une section "Comparaison
période/période" : CA net et nombre de forfaits vendus sur les 30 derniers
jours vs les 30 jours précédents, avec la variation en %.

**Export** : Google Sheets permet déjà nativement de télécharger n'importe
quel onglet en CSV/Excel (**Fichier → Télécharger**) — aucun outil
supplémentaire nécessaire.

### CRM client

Sous-menu **Elysian Admin → CRM**, étend `Fiche_Client` (ClientProfile.gs)
sans dupliquer sa logique :

- **Tags** (`Clients.tags`, ex. `vip, a-risque, nouvelle`) : ajouter/retirer
  via le menu. Affichés dans la Fiche_Client.
- **Historique des notes** (`Client_Notes`) : contrairement à
  `Clients.notes_admin` (une note "épinglée", écrasée à chaque
  modification), chaque note ajoutée ici s'accumule sans jamais écraser les
  précédentes — visible dans la Fiche_Client.
- **Rechercher des clientes** : filtre par tag (`tag:vip`), absence d'achat
  récent (`sans_achat:90`), forfait proche de l'expiration
  (`expiration:14`), ou source de réservation (`source:classpass`) —
  résultat dans l'onglet `Recherche_Clientes`.

La Fiche_Client affiche aussi désormais les **propositions d'offre**
envoyées à la cliente (`Package_Offers`) — ce champ affichait encore
"Étape B — pas encore implémenté" alors que Étape B était déjà construite ;
corrigé au passage.

### Programme de parrainage (automatique)

Règle fixe, configurable dans `Settings`, jamais une décision commerciale au
cas par cas (contrairement aux alertes de renouvellement ci-dessus, qui
restent du ressort de l'administratrice) :

- À la création d'une cliente (**Ajouter une cliente** ou une offre
  personnalisée acceptée), l'admin renseigne le **prénom + nom** de la
  marraine (c'est l'information que la nouvelle cliente donne spontanément,
  "recommandée par Untel·le" — pas son email). `findClientsByName_`
  recherche la correspondance : une seule cliente trouvée → utilisée
  directement ; plusieurs → l'admin choisit le `client_id` exact dans la
  liste affichée (jamais de choix automatique en cas d'ambiguïté) ; aucune
  → email de la marraine proposé en secours. Le tag `referred-by:CLIENT_ID`
  est alors ajouté automatiquement sur `Clients.tags` — aucune nouvelle
  table, réutilise le système de tags CRM.
- Dès qu'une cliente parrainée confirme un premier paiement (activation de
  forfait), le système compte les filleul(e)s de la marraine ayant déjà
  payé. Tous les **N** filleul(e)s (`Settings.referral_milestone_count`,
  défaut `3`), la marraine reçoit **automatiquement** un forfait offert
  (`Settings.referral_reward_sessions` séance(s), défaut `1`) — créé par
  `grantComplimentaryPackage_` (Payments.gs), avec sa propre ligne
  `Payments` confirmée à 0 et une trace complète dans `Audit_Log`.
- Dédoublonné par palier (`Reminders_Sent`, type `parrainage_palier_N`) :
  une marraine ne reçoit jamais deux fois la récompense pour le même
  palier, même si `checkReferralMilestones_` est réévaluée à chaque
  nouvelle activation de forfait.
- Un email est envoyé à la marraine pour l'informer du forfait offert — ceci
  reste une communication transactionnelle liée à une récompense déjà
  acquise (pas une offre commerciale), donc envoyé sans condition de
  consentement marketing, comme les confirmations post-achat.
- **Remise de bienvenue de la filleule** : dès que le parrainage est
  enregistré à la création de la cliente, un code promo personnel (ex.
  `WELCOME-4FQ7`) est créé **automatiquement** pour elle
  (`grantReferralWelcomePromo_`, CRM.gs) : réservé à elle, usage unique,
  remise et validité configurables dans `Settings`
  (`referral_welcome_discount_type`, défaut `percentage` ;
  `referral_welcome_discount_value`, défaut `10` — mettre `0` pour
  désactiver le programme ; `referral_welcome_validity_days`, défaut `90`).
  Le code est affiché à l'admin au moment de la création **et envoyé
  automatiquement par email à la cliente** si elle a un email
  (`Settings.referral_welcome_send_email`, défaut `oui` — mettre `non` pour
  le communiquer soi-même ; un échec d'envoi ne remet jamais en cause le
  code créé, tracé `welcome_promo_email_failed`). Il apparaît aussi sur le
  tableau de bord `/use-package` de la cliente,
  et s'applique à la saisie de son premier paiement comme n'importe quel
  code promo — aucune mécanique nouvelle, tout réutilise `Promo_Codes`.
  ⚠️ **Usage unique tous canaux confondus** : si la cliente valide son code
  `WELCOME-…` sur `/book-chelsea` (séance à l'unité), il est consommé et ne
  pourra plus s'appliquer à son premier forfait — récupérable via « Libérer
  une réclamation abandonnée » si c'était une erreur. Si l'échec de création
  du code survient (cas rarissime), la création de la cliente n'est jamais
  interrompue : l'échec est tracé dans `Audit_Log` (`welcome_promo_failed`)
  et le code peut être recréé à la main via « Créer un code promo ».

### Codes promo (`Promo_Codes`)

Sous-menu **Elysian Admin → Croissance clientèle**. Codes optionnellement
réservés à une cliente précise (`client_id` renseigné) ou génériques
(`client_id` vide) :

- **Créer un code promo** : code, remise (`percentage` ou `fixed_amount` —
  volontairement pas de type "séances offertes", pour ne jamais mélanger
  remise de paiement et ajustement de forfait), **nombre d'utilisations
  autorisées** (`usage_max`, laisser vide = 1 = usage unique), validité
  optionnelle en jours, réservation optionnelle à une cliente.
- Le code se saisit directement pendant la **saisie du paiement**
  (`promptAndRecordPayment_`, seul point d'entrée de paiement du système —
  donc disponible partout où un paiement se saisit : Enregistrer un
  paiement, Ajouter un forfait "déjà reçu", Convertir une offre en
  forfait). Un code invalide, expiré, épuisé ou réservé à une autre
  cliente est simplement ignoré (message d'alerte), sans jamais bloquer la
  saisie du paiement.
- **Usage unique par défaut**, mais un code peut être créé **multi-usages**
  (ex. un code personnel qu'une cliente partage à ses contacts pour les
  faire passer de ClassPass au système direct) : `usage_max` fixe la limite,
  chaque utilisation incrémente `usage_count`, et le code ne passe à
  `used` (définitivement épuisé) qu'une fois la limite atteinte — jusque-là
  il reste `active` et utilisable par d'autres clientes. `used_at` /
  `used_by_client_id` / `used_for_package_id` ne montrent que la
  **dernière** utilisation (aperçu rapide) ; l'historique complet de
  chaque utilisation reste dans `Audit_Log` (action `use_promo_code`).
- **Annuler un code promo** : passe un code `active` à `cancelled`,
  quel que soit son usage restant.

### Validation de code promo côté client (`/book-chelsea`, `Promo_Code_Claims`)

En plus de la saisie admin ci-dessus, un code promo peut aussi être validé
directement par la cliente sur `/book-chelsea` (email + code, action GAS
`validate-promo`, `PromoCodeClaims.gs`) avant redirection vers le calendrier
Chelsea. Chaque validation crée une ligne dans `Promo_Code_Claims`
(`claim_id`, `code`, `client_email`, `service_id`, `discount_type`,
`discount_value`, `claimed_at`, `booking_status`) et incrémente
`usage_count` sur `Promo_Codes` — un même (email, code) ne peut jamais
réclamer deux fois.

⚠️ Cet endpoint est **public et sans vérification OTP** (contrairement au
reste du parcours cliente) — protégé par son propre anti brute-force
(`enforceNotLockedOutForPromo_`/`recordFailedPromoAttempt_`, `Security.gs`,
réglage `max_promo_validation_attempts`, défaut 5 tentatives échouées avant
blocage `lockout_duration_minutes`), pour empêcher de deviner des codes ou
d'épuiser le quota d'un code multi-usages par tentatives automatisées.
L'**expiration** (`date_expiration`) est vérifiée ici aussi, comme côté
admin — un code périmé encore marqué `active` est refusé et passe `expired`
au passage ; la réconciliation quotidienne fait de toute façon expirer les
codes périmés (`promo_code_expired_reconciliation`). La validation
(lecture du quota + incrément) tourne sous verrou (`LockService`), comme la
création de codes — pas de dépassement de quota ni de code en doublon sous
requêtes simultanées.

`usage_count` est incrémenté **dès la validation**, avant même que la
cliente ait réellement réservé sur Google Calendar — si elle abandonne,
utilise **Libérer une réclamation abandonnée** (menu Croissance clientèle,
`adminReleasePromoClaim`, à partir du `claim_id` visible dans
`Promo_Code_Claims`) pour restaurer le quota consommé.

### Portail web (`/admin`, `Portal.gs`)

Une alternative web au Sheet + menu Elysian Admin :

- **Côté cliente** (`/use-package`, déjà existant) : le tableau de bord
  affiché après vérification email + code montre désormais aussi les codes
  promo actifs applicables à cette cliente (réservés à elle ou génériques),
  en plus du solde de forfait et des prochains rendez-vous.
- **Côté admin** (`/admin`) : vue d'ensemble de toutes les clientes, leurs
  forfaits actifs, **leurs rendez-vous à venir** et les codes promo qui leur
  sont applicables, plus une section **« Upcoming appointments »** globale
  (tous les rendez-vous futurs, toutes clientes confondues, triés par date).
  Recherche par nom/email.

**Rendez-vous et Google Calendar — comment ça s'articule** : chaque
réservation forfait confirmée crée TOUJOURS son événement dans le Google
Calendar dédié (`Settings.calendar_id`) au moment de la confirmation — la
synchronisation calendrier existe donc déjà, sans rien activer de plus. Le
portail `/admin` n'est qu'une **vue supplémentaire** sur les mêmes données
(onglet `Bookings` du Sheet), jamais une source concurrente : ce qu'on y
voit correspond aux événements déjà présents dans le calendrier, plus les
réservations externes saisies manuellement (ClassPass / WhatsApp,
`external_manual` — déclaratives, sans événement Calendar).

**Écritures du portail** (tout le reste reste en lecture seule) — deux
actions seulement, protégées par le même mot de passe + anti brute-force
que la vue d'ensemble, réutilisant les mêmes cœurs que le menu Sheet
(`createPromoCode_` / `cancelPromoCodeByCode_`, PromoCodes.gs), chacune
tracée dans `Audit_Log` (acteur `admin_portal`) :

- **Créer un code promo directement sur le compte d'une cliente** (bouton
  « + Add promo code » sur sa fiche — remise `%` ou `£`, validité
  optionnelle, usage unique). Le code apparaît immédiatement sur le tableau
  de bord `/use-package` de la cliente.
- **Annuler un code promo actif** (bouton `×` sur le code, avec
  confirmation — ⚠️ un code générique annulé l'est pour toutes les
  clientes).

La vue d'ensemble affiche aussi les forfaits **en attente de paiement**
(badge « awaiting payment ») pour faciliter la relance — ils restent non
réservables tant que le paiement n'est pas confirmé, comme partout — et les
**5 derniers paiements de chaque cliente** (date, moyen, montant, statut)
avec le **total net confirmé** : la vue « commandes », sans ouvrir le
Sheet. L'historique complet reste dans la Fiche_Client. Les montants ne
sont visibles que derrière le mot de passe admin, jamais côté cliente.

Authentification volontairement simple (un seul compte, pas de rôles) : un
mot de passe unique, jamais stocké en clair (hash HMAC, `Security.gs`),
défini via **Portail web → Définir le mot de passe du portail admin** dans
le menu Elysian Admin. Chaque appel renvoie le mot de passe (vérifié côté
serveur à chaque fois, pas de jeton de session à gérer), protégé par le même
anti brute-force que le reste du site (`enforceNotLockedOutForAdmin_`,
réglage `max_admin_login_attempts`, défaut 5). ⚠️ La clé de blocage étant
unique (pas par IP), n'importe qui enchaînant des mots de passe erronés
bloque aussi l'admin légitime pendant `lockout_duration_minutes` — un déni
de service auto-infligé possible, mais sans accès aux données, et préférable
à l'absence de protection contre le brute-force.

### Activer le déclencheur quotidien de notifications
Éditeur Apps Script → icône ⏰ **Déclencheurs** → **Ajouter un déclencheur** :
- Fonction : `runDailyNotifications`
- Type d'événement : **Basé sur le temps** → **Minuteries jour** → une
  plage horaire (ex. 8h–9h), comme pour `runReconciliationCheck`.

---

## Récapitulatif des fonctions utiles

| Fonction | Rôle |
|---|---|
| `initializeSheets` | Crée les onglets et leurs en-têtes (une fois) |
| `adminSyncSettingsKeys` | Ajoute à l'onglet Settings les clés de réglage manquantes (après une mise à jour du code), sans toucher aux valeurs existantes — menu « Synchroniser les réglages manquants » |
| `runReconciliationCheck` | Contrôle quotidien (à brancher sur un déclencheur) |
| `onOpen` | Ajoute le menu Elysian Admin (automatique à l'ouverture du Sheet) |
| `adminAddPackageTemplate` | Crée un modèle de forfait au catalogue |
| `adminRecordPayment` | Enregistre un paiement, calcule net/taux de frais, active le forfait si confirmé |
| `adminViewClientProfile` | Génère la fiche cliente consolidée |
| `adminCreatePackageOffer` | Génère une offre + lien à durée de vie limitée |
| `runDailyNotifications` | Rappels solde/expiration + alertes renouvellement (à brancher sur un déclencheur) |
| `adminGenerateDashboard` | Génère le tableau de bord (12 indicateurs) |

## Ce que ce système NE fait PAS (hors scope, par choix)

- Pas de self-service cliente pour annuler/reporter (admin uniquement).
- Pas de données médicales stockées.
- Ne touche à aucun des 6 Appointment Schedules payants existants.
- Pas de confirmation automatique de paiement (aucune API de paiement
  intégrée dans ce dépôt).
- Pas de synchronisation ClassPass automatique (saisie manuelle uniquement).
- Pas encore de "Proposer un forfait", de rappels automatiques, ni de
  tableau de bord (Étapes B et C, à venir).
