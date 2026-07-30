# Guide d'installation — Réservation par forfait Elysian Paris

Un seul guide, à suivre dans l'ordre, du début à la fin. Compte environ
30 à 45 minutes. Aucune connaissance technique nécessaire au-delà de
copier-coller.

À la fin de ce guide, tu passeras aux tests dans cet ordre :
1. `TEST-ETAPE-A.md`
2. `TEST-RDV-FORFAIT.md`
3. Parcours public de réservation par forfait (décrit à l'étape 10
   ci-dessous, puis approfondi plus tard une fois relié au site)

---

## Étape 1 — Créer le Google Sheet

1. Va sur **sheets.google.com**.
2. Crée un classeur vide.
3. Renomme-le en haut à gauche : `Elysian — Forfaits & Réservations`.

C'est tout pour cette étape — rien d'autre à faire ici.

---

## Étape 2 — Les onglets et colonnes : rien à créer à la main

Bonne nouvelle : tu n'as **aucun onglet ni colonne à taper toi-même**. Une
fonction du script (`initializeSheets`, étape 6 ci-dessous) crée
automatiquement tous les onglets nécessaires (`Settings`, `Clients`,
`Packages`, `Bookings`, `Package_Templates`, `Payments`, etc.) avec les
bonnes colonnes, en un seul clic. Continue à l'étape 3.

---

## Étape 3 — Installer le projet Apps Script

1. Dans ton Google Sheet : menu **Extensions → Apps Script**. Une nouvelle
   fenêtre/onglet s'ouvre (l'éditeur Apps Script), déjà lié à ce Sheet.
2. Tu vois un fichier `Code.gs` vide par défaut. Renomme-le en cliquant sur
   les 3 points à côté de son nom → **Renommer** → tape `TOUT-EN-UN` (le
   script ajoute automatiquement `.gs`).
3. Efface tout le contenu par défaut de ce fichier, puis copie-colle
   **l'intégralité** du fichier [`TOUT-EN-UN.gs`](./TOUT-EN-UN.gs) de ce
   dossier dedans. C'est un seul fichier qui contient tout le système
   (un seul copier-coller, rien d'autre à créer).
4. Le **manifeste** (fichier de configuration technique) : icône ⚙️
   **Paramètres du projet** (dans le menu de gauche) → coche **"Afficher
   le fichier manifeste appsscript.json dans l'éditeur"**.
5. Un fichier `appsscript.json` apparaît maintenant dans le menu de
   gauche. Clique dessus, efface tout son contenu, et colle celui du
   fichier [`appsscript.json`](./appsscript.json) de ce dossier.
6. **Ctrl+S** (ou Cmd+S sur Mac) pour sauvegarder le projet.

---

## Étape 4 — Les Script Properties : rien à configurer à la main

Autre bonne nouvelle : il n'y a **rien à saisir manuellement** ici non
plus. Le script génère lui-même, tout seul, une clé de sécurité interne
(`SECURITY_HMAC_KEY`) la toute première fois qu'il en a besoin, et la
stocke dans les "Propriétés du script" — un espace de stockage privé du
projet, invisible dans le Sheet et jamais envoyé sur GitHub. Tu n'as rien
à faire ici. Continue à l'étape 5.

---

## Étape 5 — Choisir (créer) le calendrier dédié

**Important : ne réutilise pas ton calendrier Google personnel ni celui de
tes Appointment Schedules payants existants.** Ce système a besoin de son
propre calendrier, séparé.

1. Va sur **calendar.google.com**.
2. Dans le menu de gauche, à côté de "Autres agendas" → clique **"+"** →
   **"Créer un agenda"**.
3. Nom : `Elysian – Réservations forfaits`. Clique **Créer un agenda**.
4. Retourne dans la liste de tes agendas (menu de gauche) → survole le
   nouvel agenda → clique les **3 points** → **Paramètres et partage**.
5. Fais défiler jusqu'à **"Intégrer l'agenda"** → copie la valeur
   **"ID de l'agenda"** (ça ressemble à
   `abcdef1234567890@group.calendar.google.com`).
6. Garde cet identifiant de côté, tu vas le coller à l'étape 6.

> ⚠️ Si tu veux que ce système et tes 6 Appointment Schedules payants
> partagent le même calendrier (pour éviter tout risque de double
> réservation entre les deux systèmes), dis-le moi avant de continuer —
> on utilisera alors l'ID du calendrier existant à la place. Sinon, garder
> deux calendriers séparés fonctionne aussi, tant que tu gères les deux
> côte à côte visuellement.

---

## Étape 6 — Autorisations Google

1. Retourne dans l'éditeur Apps Script (onglet du navigateur toujours
   ouvert depuis l'étape 3).
2. En haut, il y a un menu déroulant listant des fonctions. Clique dessus
   et choisis **`initializeSheets`**.
3. Clique sur **▶️ Exécuter**.
4. Une fenêtre **"Autorisation requise"** apparaît → **Vérifier les
   autorisations**.
5. Choisis **ton propre compte Google** (celui qui possède ce Sheet).
6. Un écran **"Google n'a pas vérifié cette application"** apparaît —
   **c'est normal** pour un script personnel écrit pour toi (via moi), pas
   pour une application publique. Clique **Paramètres avancés** (en bas à
   gauche) → **Accéder à [nom du projet] (dangereux)** → **Autoriser**.

   Ce que ces autorisations permettent concrètement, et pourquoi :
   | Autorisation demandée | Pourquoi |
   |---|---|
   | Voir et modifier des événements dans vos calendriers Google | Lire les créneaux libres, créer les rendez-vous confirmés |
   | Voir et gérer les feuilles de calcul... | Lire/écrire **uniquement ce Sheet précis** — aucun accès à tes autres fichiers Google |
   | Envoyer des emails en votre nom | Envoyer le code de vérification à 6 chiffres aux clientes — **envoi seul**, aucun accès à ta boîte de réception |

7. Une fois autorisé, l'exécution reprend automatiquement. Un message
   final confirme les onglets créés (`Onglets créés : Settings, Clients,
   Packages, ...`).
8. Retourne dans le Google Sheet (premier onglet du navigateur) → tu vois
   maintenant tous les nouveaux onglets en bas.
9. Va dans l'onglet **`Settings`** → trouve la ligne `calendar_id` →
   colle dans la colonne `value` l'identifiant du calendrier copié à
   l'étape 5.

---

## Étape 7 — Déployer la Web App

Cette étape prépare la connexion future avec le site (pas encore activée —
on ne modifie pas le code du site pour l'instant, seulement Apps Script).

1. Dans l'éditeur Apps Script, en haut à droite : **Déployer → Nouveau
   déploiement**.
2. Icône ⚙️ à côté de "Sélectionner le type" → choisis **Application
   Web**.
3. "Exécuter en tant que" : **Moi (ton adresse)**.
4. "Qui a accès" : **Tout le monde** (nécessaire — les clientes n'ont pas
   de compte Google ; l'accès reste strictement contrôlé par le code lui
   -même : vérification email + code, jamais par ce réglage).
5. Clique **Déployer**. Autorise à nouveau si demandé.
6. Copie l'**URL de la Web App** générée, et garde-la de côté (envoie-la
   moi quand tu voudras qu'on relie le site — pas maintenant).

---

## Étape 8 — Créer une cliente test

1. Retourne dans le Google Sheet (pas l'éditeur Apps Script).
2. Recharge la page (F5) si le menu **"Elysian Admin"** n'apparaît pas
   encore à côté du menu "Aide".
3. Menu **Elysian Admin → Ajouter une cliente**.
4. Renseigne : prénom, nom, **une adresse email à laquelle tu as vraiment
   accès** (tu recevras un vrai code de vérification dessus plus tard),
   téléphone (utilise un numéro que tu pourras retaper facilement pour les
   tests, ex. le tien).

**Vérifie** : une nouvelle ligne apparaît dans l'onglet `Clients` avec un
`client_id` du type `CLI-...`.

---

## Étape 9 — Créer un forfait test

1. Menu **Elysian Admin → Ajouter un forfait**.
2. Email de la cliente créée à l'étape 8.
3. `package_template_id` : laisse **vide** (saisie manuelle pour ce
   premier test).
4. Nom : `Test 3 séances`. Soins inclus : `lymphatic-1z`. Séances : `3`.
   Pas de date d'expiration.
5. À la question "Ce paiement est-il déjà reçu ?" → réponds **OUI** (pour
   ce test, on active tout de suite).
6. Moyen de paiement : `cash` (ou un autre au choix). Comme c'est un
   moyen peu traçable, un motif devient obligatoire : tape par exemple
   "Test d'installation".
7. Confirme.

**Vérifie** : dans `Packages`, le forfait est `statut = active`,
`available_sessions = 3`. Dans `Payments`, une ligne avec `statut_paiement
= confirme`.

---

## Étape 10 — Premier rendez-vous forfait test

1. Menu **Elysian Admin → Rendez-vous forfait → Ajouter un rendez-vous
   forfait**.
2. Numéro de téléphone de la cliente test (celui de l'étape 8).
3. Choisis le forfait créé à l'étape 9.
4. Soin : `lymphatic-1z`. Date/heure : un jour et une heure proches, dans
   les horaires configurés par défaut (9h–18h, du lundi au samedi — voir
   `Settings`). Durée : `60`.
5. Origine : `admin_manual`.
6. Confirme.

**Vérifie** :
- [ ] Message de confirmation avec un `calendar_event_id`.
- [ ] Un événement apparaît dans le calendrier dédié (étape 5).
- [ ] `Bookings` : nouvelle ligne `status = confirmed`.
- [ ] `Packages` : `available_sessions = 2`, `reserved_sessions = 1`.
- [ ] Menu **Elysian Admin → Fiche cliente → Voir la fiche consolidée
      d'une cliente** (même email) : le rendez-vous apparaît bien.

Si tout ça fonctionne : **l'installation est terminée et validée.**

---

## Et maintenant ?

Passe aux tests complets, dans cet ordre :

1. **`TEST-ETAPE-A.md`** — reprend en détail (avec valeurs précises à
   vérifier, ex. £900/£11 de frais) tout ce qu'on vient de faire aux
   étapes 8-9 ci-dessus, plus les cas forfait historique/offert.
2. **`TEST-RDV-FORFAIT.md`** — les 14 scénarios pour "Ajouter un
   rendez-vous forfait" (cliente sans email, forfait expiré, créneau
   occupé, double soumission, échec Calendar, report, annulation,
   no-show...).
3. **Parcours public de réservation par forfait** — sans toucher au site :
   directement depuis l'éditeur Apps Script, exécute dans l'ordre
   `requestVerificationCode("ton-email@...")`, puis (avec le vrai code
   reçu par email) `verifyCodeAndIssueToken(...)`, puis
   `computeAvailableSlots(60)`, puis `confirmPackageBooking(...)` — le
   détail exact est dans `TEST-ETAPE-A.md`, section 6, "Option A".

Je ne modifie plus le code pendant que tu testes — dis-moi simplement ce
que tu observes à chaque étape, et je n'interviendrai que si un vrai
problème apparaît.
