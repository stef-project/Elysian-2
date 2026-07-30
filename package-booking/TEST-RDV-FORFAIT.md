# Guide de test — "Ajouter un rendez-vous forfait"

À faire après avoir validé `TEST-ETAPE-A.md` (au moins un forfait `active`
existant est nécessaire pour la plupart de ces tests). Utilise une cliente
de test avec un forfait actif ayant plusieurs séances disponibles.

## 1. Création normale d'un rendez-vous forfait

Menu **Elysian Admin → Rendez-vous forfait → Ajouter un rendez-vous
forfait**. Renseigne le téléphone d'une cliente ayant un forfait `active`,
choisis le forfait, un soin inclus, une date/heure/durée libres, une
origine (ex. `whatsapp`).

- [ ] Confirmation affichée avec un `calendar_event_id`.
- [ ] `Bookings` : nouvelle ligne `status = confirmed`, `source` = origine
      choisie, `created_by` = ton adresse email (ou "admin" si non
      détectable).
- [ ] `Packages` : `available_sessions` −1, `reserved_sessions` +1.
- [ ] Un événement apparaît dans le calendrier dédié, titre = soin + nom de
      la cliente (**pas** de prix, séances restantes, moyen de paiement).
- [ ] `Audit_Log` : ligne `admin_create_booking`.

## 2. Cliente sans email

Utilise une cliente test dont le champ `email` est vide dans `Clients`.
Recherche-la par téléphone, laisse le champ email facultatif vide.

- [ ] Le rendez-vous se crée normalement.
- [ ] L'événement Calendar est créé **sans invité** (pas de `sendInvites`
      effectif) — aucune erreur.

## 3. Forfait sans séance disponible

Utilise (ou force via "Ajuster le solde") un forfait avec
`available_sessions = 0`.

- [ ] Message d'erreur clair : "Aucune séance disponible sur ce forfait."
- [ ] Aucune ligne `Bookings` créée, aucun compteur modifié, aucun
      événement Calendar créé.

## 4. Soin non inclus dans le forfait

Choisis un `serviceId` qui n'apparaît pas dans `soins_inclus` du forfait
sélectionné.

- [ ] Message d'erreur : "Ce soin n'est pas inclus dans ce forfait."
- [ ] Aucune modification nulle part.

## 5. Forfait expiré

Renseigne une `date_expiration` dans le passé sur un forfait `active` de
test.

- [ ] Message d'erreur : "Ce forfait est expiré."
- [ ] Aucune modification nulle part.

## 6. Créneau déjà occupé

Crée d'abord un rendez-vous sur un créneau (test 1), puis retente d'en
créer un second sur exactement le même horaire (autre cliente ou même
cliente).

- [ ] Message : "Ce créneau vient d'être réservé par quelqu'un d'autre..."
- [ ] Aucune séance déduite pour cette seconde tentative.

## 7. Double clic / double soumission

Relance **immédiatement** le même formulaire avec exactement les mêmes
cliente/forfait/soin/date/heure qu'un rendez-vous déjà créé au test 1.

- [ ] Message : "Un rendez-vous identique existe déjà pour cette cliente."
- [ ] Une seule ligne `Bookings` au total pour ce créneau, une seule
      séance déduite, un seul événement Calendar.

## 8. Échec Calendar

Le plus simple pour simuler ceci : renseigne temporairement un
`calendar_id` invalide dans `Settings` (ex. ajoute un caractère), lance
`clearSettingsCache` si besoin, puis tente de créer un rendez-vous.

- [ ] Message : "Calendrier configuré introuvable ou inaccessible..."
      (détecté tôt, avant toute écriture) **ou**, si tu forces l'échec
      après ce point (ex. calendrier supprimé entre-temps), message :
      "La réservation n'a pas pu être finalisée..."
- [ ] Dans tous les cas : `available_sessions`/`reserved_sessions`
      reviennent à leur valeur d'avant tentative (aucune séance perdue).
- [ ] Si l'échec survient après création de la ligne `Bookings` : son
      `status` passe à `failed`, avec le détail de l'erreur dans
      `history_notes`.
- [ ] Remets le bon `calendar_id` avant de continuer les tests suivants.

## 9. Report du rendez-vous

Sur un rendez-vous `confirmed` créé au test 1 : **Elysian Admin → Reporter
un rendez-vous**, renseigne un nouveau créneau libre.

- [ ] Le `booking_id` reste le même.
- [ ] `available_sessions`/`reserved_sessions` **inchangés** (aucune
      séance supplémentaire consommée).
- [ ] Ancien événement Calendar supprimé, nouveau créé au nouveau créneau.

## 10. Annulation avec restauration

Sur un rendez-vous `confirmed` dont le créneau est encore loin dans le
temps (≥ `cancellation_deadline_hours`, 24h par défaut) : **Elysian Admin
→ Annuler un rendez-vous (cliente)**.

- [ ] `reserved_sessions` −1, `available_sessions` +1 (séance restaurée).
- [ ] `Bookings.status` = `cancelled_authorized`.
- [ ] Événement Calendar supprimé.

## 11. Annulation tardive

Crée un rendez-vous dans moins de 24h (ou ajuste temporairement
`cancellation_deadline_hours` dans `Settings` pour tester plus vite), puis
annule-le côté cliente.

- [ ] Par défaut : `reserved_sessions` −1, `used_sessions` +1 (séance
      considérée utilisée, **pas** restaurée).
- [ ] Une dérogation manuelle (restaurer quand même) exige un motif
      obligatoire, sinon l'opération est refusée.

## 12. No-show

Sur un rendez-vous `confirmed` passé : **Elysian Admin → Marquer une
séance utilisée**.

- [ ] `reserved_sessions` −1, `used_sessions` +1.
- [ ] `Bookings.status` = `no_show_or_late_cancel`.

## 13. Affichage dans la Fiche_Client

**Elysian Admin → Fiche cliente → Voir la fiche consolidée d'une
cliente**, pour la cliente utilisée dans ces tests.

- [ ] Chaque rendez-vous créé apparaît avec : date, soin, statut, forfait
      utilisé (`package_id`), origine (`source`), `calendar_event_id`, et
      "créé par" (`created_by`).

## 14. Écriture correcte dans Audit_Log

Parcours l'onglet `Audit_Log` pour la séquence de tests ci-dessus.

- [ ] Une ligne `admin_create_booking` par rendez-vous créé.
- [ ] Une ligne `reschedule_booking` pour le test 9.
- [ ] Une ligne `cancel_booking` pour les tests 10 et 11.
- [ ] Une ligne `mark_session_used` pour le test 12.
- [ ] Chaque ligne porte un motif non vide quand une dérogation manuelle a
      été utilisée.

---

## Invariant à vérifier après CHAQUE test ci-dessus

```
available_sessions + reserved_sessions + used_sessions === total_sessions
```

sur le(s) forfait(s) utilisé(s). Note-moi précisément la séquence d'actions
si ce n'est pas le cas à un moment donné.

## À me remonter après le test

Comme pour `TEST-ETAPE-A.md` : pour chaque point ❌, l'étape concernée, la
valeur observée vs. attendue.
