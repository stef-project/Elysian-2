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
[`TOUT-EN-UN.gs`](./TOUT-EN-UN.gs) de ce dossier — il regroupe les 14 fichiers
ci-dessous (mêmes fonctions, même comportement) en un seul copier-coller,
comme pour `gmail-automation/TOUT-EN-UN.gs`. Tu peux supprimer le fichier
`Code.gs` par défaut.

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

### Pas encore fait (Étapes B et C du plan Phase 2)
- Bouton "Proposer un forfait" (génération d'offre, lien WhatsApp/email,
  statuts draft/sent/viewed/accepted/paid/expired/declined/cancelled).
- Rappels de solde/expiration, alertes de renouvellement, tableau de bord.

Ces étapes suivantes toucheront potentiellement une route publique
supplémentaire (page de consultation d'offre) — elle sera, comme
`/use-package`, protégée par le même mécanisme de feature flag
(`VITE_...=false` par défaut) tant que non validée et testée.

---

## Récapitulatif des fonctions utiles

| Fonction | Rôle |
|---|---|
| `initializeSheets` | Crée les onglets et leurs en-têtes (une fois) |
| `runReconciliationCheck` | Contrôle quotidien (à brancher sur un déclencheur) |
| `onOpen` | Ajoute le menu Elysian Admin (automatique à l'ouverture du Sheet) |
| `adminAddPackageTemplate` | Crée un modèle de forfait au catalogue |
| `adminRecordPayment` | Enregistre un paiement, calcule net/taux de frais, active le forfait si confirmé |
| `adminViewClientProfile` | Génère la fiche cliente consolidée |

## Ce que ce système NE fait PAS (hors scope, par choix)

- Pas de self-service cliente pour annuler/reporter (admin uniquement).
- Pas de données médicales stockées.
- Ne touche à aucun des 6 Appointment Schedules payants existants.
- Pas de confirmation automatique de paiement (aucune API de paiement
  intégrée dans ce dépôt).
- Pas de synchronisation ClassPass automatique (saisie manuelle uniquement).
- Pas encore de "Proposer un forfait", de rappels automatiques, ni de
  tableau de bord (Étapes B et C, à venir).
