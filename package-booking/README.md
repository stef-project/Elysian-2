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
[`TOUT-EN-UN.gs`](./TOUT-EN-UN.gs) de ce dossier — il regroupe les 11 fichiers
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

## Récapitulatif des fonctions utiles

| Fonction | Rôle |
|---|---|
| `initializeSheets` | Crée les onglets et leurs en-têtes (une fois) |
| `runReconciliationCheck` | Contrôle quotidien (à brancher sur un déclencheur) |
| `onOpen` | Ajoute le menu Elysian Admin (automatique à l'ouverture du Sheet) |

## Ce que ce système NE fait PAS (hors scope V1, par choix)

- Pas de self-service cliente pour annuler/reporter (admin uniquement) —
  évoqué comme phase 2 possible.
- Pas de données médicales stockées.
- Ne touche à aucun des 6 Appointment Schedules payants existants.
