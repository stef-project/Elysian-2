// Enregistrement du service worker (public/sw.js) — nécessaire pour que le
// site soit installable (icône sur l'écran d'accueil, ouverture en plein
// écran). Silencieux en cas d'échec : ne doit jamais bloquer le chargement
// du site pour une fonctionnalité annexe.
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
