// ─────────────────────────────────────────────────────────────────────────
//  Source unique des liens & coordonnées du site.
//  ⚠️ Modifie UNIQUEMENT ici — tout le site lit ces valeurs.
//     (C'est ce qui a manqué quand le lien "Book Now" est devenu obsolète.)
// ─────────────────────────────────────────────────────────────────────────

// Coordonnées
export const PHONE_E164 = "447742091557"; // format international sans "+"
export const PHONE_DISPLAY = "07742 091557";
export const EMAIL = "info@elysian-institute.com";
export const ADDRESS = "61 Kensington Church Street, London W8 4BA";

// WhatsApp (message pré-rempli par défaut)
export const WHATSAPP_URL =
  `https://wa.me/${PHONE_E164}?text=Hello%20I%20want%20to%20know%20more`;

// Construit un lien WhatsApp avec un message personnalisé.
export const whatsappWith = (text: string) =>
  `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(text)}`;

// Construit un lien e-mail (mailto) pré-rempli.
export const mailtoWith = (subject: string, body: string) =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

// Le bouton générique « Book Now » envoie vers la liste des traitements (#treatments),
// où chaque soin a son propre lien Google Calendar qui fonctionne (bouton « Reserve »).
// L'ancien lien unique ("...Vdgk5XD1apxPp36U6") avait été supprimé côté Google
// et affichait "Appointment not found".
export const BOOKING_URL = "/#treatments";
