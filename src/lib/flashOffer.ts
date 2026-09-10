// Offre flash ponctuelle (popup) — désactivée automatiquement après l'heure
// limite, sans intervention manuelle. +01:00 = heure d'été britannique
// (BST), fixe et sans ambiguïté quel que soit le fuseau horaire de la
// visiteuse.
export const FLASH_OFFER_DEADLINE = new Date("2026-09-13T00:00:00+01:00");

export function isFlashOfferActive(): boolean {
  return new Date() < FLASH_OFFER_DEADLINE;
}
