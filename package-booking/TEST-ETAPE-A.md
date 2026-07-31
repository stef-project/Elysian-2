# Guide de test — Phase 2, Étape A

À faire une fois le Sheet initialisé (`initializeSheets`), le `calendar_id`
renseigné dans `Settings`, et la Web App déployée (voir `README.md`,
sections 1 à 8). Utilise une adresse email à laquelle tu as vraiment accès
pour les tests (tu recevras le code de vérification dessus).

Coche chaque étape au fur et à mesure. Si un point échoue, note l'onglet et
la valeur observée avant de me le signaler — je corrigerai avant l'Étape B.

---

## 0. Avant de commencer

- [ ] Ouvre le Google Sheet. Le menu **"Elysian Admin"** apparaît (sinon :
      recharge la page, ou relance `onOpen` depuis l'éditeur Apps Script).
- [ ] Onglet `Settings` → `calendar_id` est bien renseigné.
- [ ] Décide comment tu testeras la réservation finale (étape 7) :
  - **Option A (recommandée si le site n'est pas encore relié)** : depuis
    l'éditeur Apps Script, tu exécuteras des fonctions à la main
    (`requestVerificationCode`, `verifyCodeAndIssueToken`,
    `confirmPackageBooking`) — voir l'encadré à l'étape 7.
  - **Option B** : si `PACKAGE_BOOKING_WEB_APP_URL` est déjà renseignée
    dans `src/lib/packageBooking.ts` et `VITE_PACKAGE_BOOKING_ENABLED=true`
    en local/preview, tu peux tester directement via `/use-package`.

---

## 1. Création d'une cliente

Menu **Elysian Admin → Ajouter une cliente**.
- Prénom, nom, email (ta vraie adresse de test), téléphone (optionnel).

**Vérifier dans l'onglet `Clients`** :
- [ ] Une nouvelle ligne apparaît avec un `client_id` du type `CLI-...`.
- [ ] `origine_premiere_reservation` et `consentement_marketing` existent
      comme colonnes (vides pour l'instant — normal, pas encore saisies par
      ce flux, tu peux les remplir à la main si tu veux les tester).

## 2. Création d'un forfait en attente de paiement

Menu **Elysian Admin → Ajouter un forfait**.
- Email de la cliente créée à l'étape 1.
- `package_template_id` : laisse **vide** pour l'instant (test en saisie
  manuelle) — ex. nom "Test 3 séances Drainage", soins `lymphatic-1z`,
  3 séances, pas de date d'expiration.
- À la question **"Ce paiement est-il déjà reçu ?"** → réponds **NON**.

**Vérifier dans l'onglet `Packages`** :
- [ ] Nouvelle ligne, `package_id` du type `PKG-...`.
- [ ] `statut` = **`pending_payment`**.
- [ ] `total_sessions` = 3, `available_sessions` = 3, `reserved_sessions` = 0,
      `used_sessions` = 0.
- [ ] `moyen_paiement` est vide (normal — il est maintenant capturé dans
      `Payments`, pas ici).

**Vérifier dans `Audit_Log`** :
- [ ] Une ligne `add_package` avec la mention `pending_payment`.

## 3. Impossibilité de réserver avec ce forfait tant qu'il est en attente

Depuis l'éditeur Apps Script, exécute manuellement (colle temporairement
dans une fonction de test, ou utilise l'exécuteur avec des paramètres) :

```js
function testEtapeA_shouldFail() {
  Logger.log(findEligiblePackages_(client.client_id, 'lymphatic-1z'));
}
```

- [ ] `findEligiblePackages_` renvoie un tableau **vide** pour ce forfait
      (il filtre `statut !== ACTIVE`) — le forfait n'apparaît dans aucune
      liste de forfaits réservables.
- [ ] Si tu vas jusqu'au bout du parcours de vérification (email + code) et
      tentes `confirmPackageBooking`, l'erreur métier attendue est
      `"Ce forfait n'est pas actif."`.

## 4. Enregistrement d'un paiement de £900 avec £11 de frais

Menu **Elysian Admin → Paiements → Enregistrer un paiement**.
- `package_id` : celui créé à l'étape 2.
- Moyen de paiement : `bank_transfer` (ou `stripe`/`revolut_card_payment`,
  peu importe pour ce test).
- Devise : `GBP`.
- Montant brut : `900`.
- Frais : `11`.
- Référence de transaction : ex. `TEST-REF-001`.
- Justificatif : optionnel pour ce moyen.
- À la question **"Confirmer ce paiement maintenant ?"** → réponds **OUI**.

**Vérifier dans l'onglet `Payments`** :
- [ ] Nouvelle ligne, `payment_id` du type `PAY-...`.
- [ ] `montant_brut` = 900, `frais_paiement` = 11.
- [ ] **`montant_net` = 889** (900 − 11).
- [ ] **`taux_frais` ≈ 0,0122** (soit **1,22 %** — `11 / 900`). La valeur
      brute stockée est un ratio décimal (`0.0122...`), pas un pourcentage
      formaté ; multiplie par 100 pour lire "1,22 %".
- [ ] `statut_paiement` = `confirme`.
- [ ] `mode_saisie` = `manuel`.

## 5. Passage du forfait à `active`

**Vérifier dans l'onglet `Packages`** (même ligne qu'à l'étape 2) :
- [ ] `statut` est passé automatiquement à **`active`** (déclenché par la
      confirmation du paiement à l'étape 4, sans action supplémentaire).

**Vérifier dans `Audit_Log`** :
- [ ] Une ligne `record_payment`.
- [ ] Une ligne `activate_package` (`pending_payment` → `active`).

## 6. Réservation avec ce forfait

**Option A — via l'éditeur Apps Script (recommandé pour ce test) :**

1. Exécute `requestVerificationCode("ton-email-de-test@...")`.
2. Vérifie que l'email avec le code à 6 chiffres arrive.
3. Exécute `verifyCodeAndIssueToken("ton-email-de-test@...", "123456")`
   (le vrai code reçu) — note le `sessionToken` renvoyé.
4. Exécute `computeAvailableSlots(60)` pour obtenir un créneau libre
   (`lymphatic-1z` dure 60 min).
5. Exécute `confirmPackageBooking(sessionToken, "test-req-1", "lymphatic-1z", slot.start, slot.end)`
   avec un des créneaux renvoyés à l'étape précédente.

**Option B — via le site**, si déjà relié : suis le parcours `/use-package`
normalement (email → code → soin → créneau → confirmation).

**Vérifier** :
- [ ] La fonction renvoie `{ status: 'confirmed', calendarEventId: '...' }`.
- [ ] Un nouvel événement apparaît dans le calendrier dédié (`calendar_id`),
      avec la cliente en invitée et `booking_id: ...` dans la description.
- [ ] Onglet `Bookings` : nouvelle ligne, `status` = `confirmed`.
- [ ] Onglet `Packages` : `available_sessions` = 2, `reserved_sessions` = 1
      (sur les 3 initiales).

## 7. Affichage dans la Fiche_Client

Menu **Elysian Admin → Fiche cliente → Voir la fiche consolidée d'une
cliente**, avec l'email de la cliente test.

**Vérifier dans l'onglet `Fiche_Client`** :
- [ ] Section "Forfaits actifs" montre le forfait avec `dispo 2 / réservées
      1 / utilisées 0 / total 3`.
- [ ] Section "Rendez-vous futurs" montre la réservation créée à l'étape 6.
- [ ] Section "Paiements" montre la ligne `PAY-...` avec `900 GBP brut — 11
      frais — 889.00 net — bank_transfer — confirme`.
- [ ] Ligne "Total confirmé" reflète bien `900.00 brut — 11.00 frais —
      889.00 net`.

## 8. Ajout d'un forfait historique déjà payé

Menu **Elysian Admin → Ajouter un forfait** (même cliente ou une nouvelle).
- Saisie manuelle ou via un modèle du catalogue.
- À la question **"Ce paiement est-il déjà reçu ?"** → réponds **OUI**.
- Renseigne le paiement (ex. `cash`, montant réel, frais `0`) — comme
  `cash` fait partie des moyens peu traçables, un **motif devient
  obligatoire** : renseigne par exemple "Paiement historique en espèces,
  reçu le [date], voir carnet de rendez-vous papier".

**Vérifier** :
- [ ] Le forfait est créé directement au statut **`active`** (pas de
      passage manuel supplémentaire par "Enregistrer un paiement").
- [ ] Une ligne `Payments` existe avec `statut_paiement = confirme` et
      `justificatif_notes` rempli.
- [ ] Si tu avais laissé le motif vide, l'opération aurait dû être
      **refusée** ("Motif obligatoire pour ce moyen de paiement... opération
      annulée.") — tu peux tester ce cas en annulant volontairement une
      saisie sans motif pour confirmer le blocage.

## 9. Ajout d'un forfait offert

Menu **Elysian Admin → Ajouter un forfait**, réponds **OUI** à "paiement
déjà reçu", puis choisis le moyen `complimentary`.

**Vérifier** :
- [ ] Un message confirme que le montant brut et les frais sont fixés à
      **0 automatiquement** (aucune question de montant posée).
- [ ] Le motif est **obligatoire** — tester qu'un motif vide bloque bien
      l'opération.
- [ ] Une fois le motif saisi (ex. "Forfait offert - remerciement
      fidélité"), le forfait passe directement à `active`.
- [ ] Onglet `Payments` : ligne avec `montant_brut = 0`, `frais_paiement =
      0`, `montant_net = 0`, `moyen_paiement = complimentary`,
      `statut_paiement = confirme`.

## 10. Modification manuelle avec Audit_Log

Menu **Elysian Admin → Ajuster le solde d'un forfait** sur un des forfaits
de test (ex. forcer `available_sessions` à une autre valeur), avec un motif
obligatoire.

**Vérifier** :
- [ ] `Packages` reflète la nouvelle valeur.
- [ ] `Audit_Log` contient une ligne `adjust_balance` avec l'ancienne
      valeur, la nouvelle, et le motif saisi.
- [ ] Refais le test en laissant le motif vide → l'opération doit être
      **refusée** ("Motif obligatoire, opération annulée.").

## 11. Vérification de l'invariant des séances

Pour **chaque ligne** de l'onglet `Packages` créée pendant ces tests,
vérifie manuellement :

```
available_sessions + reserved_sessions + used_sessions === total_sessions
```

- [ ] Forfait de l'étape 2/4/5/6 : `2 + 1 + 0 = 3` ✅.
- [ ] Forfait historique (étape 8) : selon le nombre de séances choisi,
      `available + reserved + used = total`.
- [ ] Forfait offert (étape 9) : idem.

Si un forfait casse cet invariant après un test, note précisément la
séquence d'actions qui y a mené (quelle fonction, dans quel ordre) — c'est
le signal le plus important à me remonter, l'invariant ne doit **jamais**
être violé.

---

## À me remonter après le test

Pour chaque point coché ❌ ou inattendu : l'étape concernée, la valeur
observée vs. attendue, et si possible une capture de la ligne du Sheet
concernée (ou juste le contenu texte de la ligne). Je corrige avant de
passer à l'Étape B ("Proposer un forfait").
