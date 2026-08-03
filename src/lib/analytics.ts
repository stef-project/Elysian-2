// Petit helper GA4 pour les clics sur les CTA (Book Now / WhatsApp) — au-delà
// des pageviews automatiques du tag déjà posé dans chaque index.html. N'écrit
// jamais rien si gtag n'est pas chargé (dev local, bloqueur de pub) : ne
// jamais faire dépendre la navigation elle-même de l'analytics.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, string>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

export const trackBookClick = (location: string) => trackEvent("book_click", { location });
export const trackWhatsappClick = (location: string) => trackEvent("whatsapp_click", { location });
