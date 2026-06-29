# Automatisation Gmail + Google Calendar — Elysian Paris

Assistant de tri des e-mails du formulaire du site. Pour chaque nouvelle
demande, il **classe** le message, regarde tes **disponibilités Google
Calendar** si c'est un rendez-vous, puis crée un **brouillon de réponse poli**
dans Gmail. Il pose aussi un **label** par catégorie.

> 🔒 **Sécurité avant tout : par défaut le script N'ENVOIE RIEN.**
> Il crée seulement des brouillons que tu relis et envoies à la main.

---

## 1. Ce dont tu as besoin

- Ton compte **Google Workspace** (tu l'as ✅) — celui qui reçoit les mails du site.
- Rien à installer sur ton ordinateur. Tout se passe dans le navigateur.

---

## 2. Créer le projet Apps Script (5 min)

1. Va sur **https://script.google.com** → clique **« Nouveau projet »**.
2. En haut à gauche, renomme le projet : `Elysian – Tri e-mails`.
3. Tu vois un fichier `Code.gs` par défaut. On va recréer les fichiers de ce
   dossier **un par un** :
   - Pour chaque fichier `.gs` ci-dessous, clique le **`+`** à côté de
     « Fichiers » → **Script** → donne-lui le même nom (sans `.gs`), puis
     **copie-colle** son contenu.
   - Fichiers à créer : `Config`, `Code`, `Classifier`, `Calendar`, `Templates`.
   - Tu peux coller le contenu de `Code.gs` (ce dépôt) dans le `Code.gs`
     existant pour ne pas en avoir deux.
4. **Le manifeste** (`appsscript.json`) : clique l'icône ⚙️ **Paramètres du
   projet** → coche **« Afficher le fichier manifeste appsscript.json dans
   l'éditeur »**. Un fichier `appsscript.json` apparaît : remplace son contenu
   par celui de ce dossier (il déclare les autorisations et le fuseau Londres).
5. Clique 💾 **Enregistrer**.

> 💡 Les fichiers `.gs` partagent tous le même espace : l'ordre n'a pas
> d'importance, et `CONFIG` défini dans `Config.gs` est visible partout.

---

## 3. Régler `Config.gs` (l'étape importante)

Ouvre `Config.gs` et adapte :

| Réglage | À mettre |
|---|---|
| `SITE.fromAddresses` | L'adresse qui envoie les mails du formulaire (ouvre un vrai mail reçu, regarde le « De : »). |
| `SITE.subjectContains` | Des mots présents dans l'objet de ces mails. Remplis l'un OU l'autre (ou les deux). |
| `CALENDAR.calendarId` | `primary` pour ton agenda principal, sinon l'ID d'un agenda dédié. |
| `CALENDAR.workdayStartHour / EndHour` | Tes heures d'ouverture. |
| `CALENDAR.workdays` | Tes jours travaillés (1=lundi … 7=dimanche). |
| `CALENDAR.appointmentMinutes` | Durée d'une séance. |

Le **numéro WhatsApp 07742 091557** est déjà dans la signature : il apparaîtra
dans **chaque** brouillon. ✅

> ⚠️ **Trouver le bon filtre.** Si tu n'es pas sûr, mets juste un mot d'objet
> très probable (ex. `contact form`) puis lance le **test à blanc** (étape 5)
> pour voir si les bons mails sont détectés.

---

## 4. Première autorisation

1. En haut, dans le menu déroulant des fonctions, choisis **`dryRun`**.
2. Clique **▶️ Exécuter**.
3. Google demande d'**autoriser** l'accès à Gmail et Calendar :
   - Choisis ton compte → **« Paramètres avancés »** → **« Accéder à
     (projet) »** → **Autoriser**.
   - (L'avertissement « application non vérifiée » est normal pour un script
     personnel que **tu** as écrit.)

Autorisations demandées et **pourquoi** (voir `appsscript.json`) :
- `gmail.modify` : lire les mails, créer des **brouillons**, poser des labels.
  *(Ce périmètre n'autorise pas la suppression définitive de mails.)*
- `calendar.readonly` : **lecture seule** de l'agenda (chercher des créneaux).
  Le script **ne crée ni ne modifie aucun événement**.
- `script.external_request` : seulement si tu actives l'option IA (Gemini).

---

## 5. Tester sans risque (à faire absolument)

Lance ces fonctions **dans cet ordre** (menu déroulant → ▶️ Exécuter), puis
ouvre **« Journal d'exécution »** pour lire le résultat :

1. **`dryRun`** → liste les mails détectés et leur catégorie. **Ne crée rien,
   n'envoie rien.** Sert à valider ton filtre et la classification.
2. **`testCalendar`** → affiche les créneaux qui seraient proposés. Vérifie
   qu'ils tombent bien sur tes horaires/jours d'ouverture.
3. **`processInbox`** → traitement réel : crée les **brouillons** et pose les
   labels. Va ensuite dans Gmail → dossier **Brouillons** → relis. Rien n'est
   parti tant que tu ne cliques pas « Envoyer ».

> Astuce : envoie-toi un faux mail de test avec un objet contenant un de tes
> mots-clés (ex. « contact form – test rendez-vous »), puis lance `dryRun`.

---

## 6. Rendre l'automatisation… automatique

Quand les brouillons te conviennent :

1. Choisis **`installTrigger`** → ▶️ Exécuter.
   → Le script tournera **tout seul toutes les 15 minutes**.
2. Pour **arrêter** à tout moment : lance **`removeTrigger`**.

Tu peux suivre/gérer ça dans l'éditeur : icône ⏰ **Déclencheurs** (à gauche).

---

## 7. Éviter de perdre des données ou d'envoyer par erreur

- ✅ **Aucun envoi automatique** par défaut (`SEND_MODE: 'draft'`). Le script
  crée des brouillons, point.
- ✅ **Aucune suppression** : le script ne supprime jamais de mail ni
  d'événement d'agenda. L'agenda est en **lecture seule**.
- ✅ **Anti-doublon** : chaque fil traité reçoit le label `Auto/Traité` ; il ne
  sera jamais re-traité (donc pas de brouillons en double).
- ✅ **Reprise sur erreur** : si une étape échoue, le label « Traité » n'est pas
  posé → le mail sera réessayé au prochain passage.
- ✅ **Plafond** : `maxThreadsPerRun` limite le nombre de mails par exécution.
- ✅ **Filtre récent** : seuls les mails de moins de 30 jours sont examinés
  (pas de réveil d'anciens messages).

### Si un jour tu veux l'envoi automatique
Tu m'as dit que ça ne te dérange pas. Techniquement, il suffit de mettre
`SEND_MODE: 'send'` dans `Config.gs`. **Je te le déconseille pour une clinique** :
un tarif erroné ou un créneau déjà pris partirait sans relecture. Le compromis
idéal : garde `'draft'`, et comme Gmail garde les brouillons en haut du fil,
tu valides en 2 secondes depuis ton téléphone.

---

## 8. (Optionnel) Activer la vraie analyse IA (Gemini)

Par défaut, la classification utilise des **mots-clés** (gratuit, instantané,
fiable pour des demandes claires). Pour une analyse IA plus fine :

1. Crée une clé sur **https://aistudio.google.com/apikey**.
2. Dans `Config.gs` → `AI.useGeminiAI = true` et colle la clé dans
   `AI.geminiApiKey`.
3. Si l'IA échoue (quota/réseau), le script **retombe automatiquement** sur les
   mots-clés : aucune demande n'est perdue.

> 🔐 **Ne mets jamais ta vraie clé API dans Git / GitHub.** Garde-la uniquement
> dans le projet Apps Script. (Idéalement, range-la dans
> *Paramètres du projet → Propriétés du script* plutôt qu'en clair.)

---

## 9. Personnaliser les réponses

Ouvre `Templates.gs` : un modèle par catégorie. Les zones `[À COMPLÉTER : …]`
sont là où tu dois mettre **tes** infos (grille tarifaire, description des
soins, etc.). Tu peux tout réécrire, en anglais ou en français.

---

## Récapitulatif des fonctions

| Fonction | Rôle |
|---|---|
| `dryRun` | Test à blanc : détecte + classe, **ne crée rien**. |
| `testCalendar` | Affiche les créneaux libres proposés. |
| `processInbox` | Traitement réel : crée les brouillons + labels. |
| `installTrigger` | Lance l'automatisation (toutes les 15 min). |
| `removeTrigger` | Arrête l'automatisation. |
