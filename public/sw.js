// Service worker minimal, volontairement sans mise en cache : le seul but est
// de rendre le site installable (icône sur l'écran d'accueil, ouverture en
// plein écran). Un cache agressif ici risquerait de servir du contenu périmé
// après chaque déploiement Vercel — tout passe donc directement au réseau.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
