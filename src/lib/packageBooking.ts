// ─────────────────────────────────────────────────────────────────────────
//  Client pour la Web App Apps Script "réservation par forfait".
//  ⚠️ Aucun secret ici : uniquement l'URL publique du endpoint (le Web App
//     lui-même est protégé par vérification email + code, pas par le secret
//     de cette URL — voir package-booking/WebApp.gs et README.md).
// ─────────────────────────────────────────────────────────────────────────

// URL de la Web App Apps Script — priorité à la variable d'env Vercel
// (VITE_PACKAGE_BOOKING_WEBAPP_URL) pour permettre de la surcharger par
// environnement sans modifier le code.
export const PACKAGE_BOOKING_WEB_APP_URL =
  (import.meta.env.VITE_PACKAGE_BOOKING_WEBAPP_URL as string | undefined) ||
  "https://script.google.com/macros/s/AKfycbyF9qnNiaTGdkHGNeRVhGg8R7N1OgcyiRzNsPMPfSdx5WvirrvGcoQl-8enpY-lbvJ8gA/exec";

export const isPackageBookingConfigured = () => PACKAGE_BOOKING_WEB_APP_URL.length > 0;

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

// Content-Type volontairement "text/plain" : évite le preflight CORS que les
// Web Apps Apps Script ne savent pas gérer. Le corps reste du JSON valide.
async function callWebApp<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!isPackageBookingConfigured()) {
    throw new Error("Ce service n'est pas encore disponible. Merci de nous contacter directement.");
  }
  let res: Response;
  try {
    res = await fetch(PACKAGE_BOOKING_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    // La requête elle-même a échoué (hors ligne, DNS, etc.) avant toute
    // réponse — même principe que le catch JSON ci-dessous : jamais montrer
    // le message technique brut du navigateur (ex. "Failed to fetch").
    throw new Error("Une erreur est survenue, merci de réessayer.");
  }
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // Réponse non-JSON (ex. page d'erreur HTML lors d'un cold start Apps
    // Script juste après un redéploiement) — jamais montrer l'erreur de
    // parsing brute à la cliente, seulement un message générique.
    throw new Error("Une erreur est survenue, merci de réessayer.");
  }
  if (json.success === false) {
    throw new Error(json.error);
  }
  return json.data;
}

export const requestVerificationCode = (email: string) =>
  callWebApp<{ message: string }>("request-code", { email });

export const verifyCode = (email: string, code: string) =>
  callWebApp<{
    sessionToken: string;
    expiresInMinutes: number;
    eligibleServices: string[];
    packageName: string;
    availableSessions: number;
  }>("verify-code", { email, code });

export const getAvailableSlots = (sessionToken: string, serviceId: string, durationMinutes: number) =>
  callWebApp<{ slots: { start: string; end: string }[] }>("get-slots", {
    sessionToken,
    serviceId,
    durationMinutes,
  });

export type ActivePromoCode = {
  code: string;
  discountType: "fixed_amount" | "percentage";
  discountValue: number;
};

// Solde du forfait + prochains rendez-vous + codes promo actifs pour cette
// cliente, affiché avant la sélection de créneau — la cliente voit où elle
// en est sans avoir à nous contacter.
export const getClientDashboard = (sessionToken: string) =>
  callWebApp<{
    packageName: string;
    availableSessions: number;
    upcomingBookings: { serviceId: string; start: string; end: string }[];
    activePromoCodes: ActivePromoCode[];
  }>("get-client-dashboard", { sessionToken });

export const confirmBooking = (
  sessionToken: string,
  bookingRequestId: string,
  serviceId: string,
  startIso: string,
  endIso: string
) =>
  callWebApp<{ status: string; calendarEventId: string }>("confirm-booking", {
    sessionToken,
    bookingRequestId,
    serviceId,
    startIso,
    endIso,
  });

// Génère un identifiant unique par tentative de réservation (idempotence).
// Renvoyé tel quel en cas de nouvelle tentative après une coupure réseau.
export const generateBookingRequestId = () =>
  (crypto as Crypto).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

// ─────────────────────────────────────────────────────────────────────────
//  Offres de forfait (Phase 2, Étape B) — page /offer/:offerId.
//  getOfferDetails est l'appel qui valide le jeton ET fait passer
//  sent/draft -> viewed côté backend : ne jamais afficher le contenu de
//  l'offre avant que cet appel ait répondu avec succès.
// ─────────────────────────────────────────────────────────────────────────

export const getOfferDetails = (offerId: string, token: string) =>
  callWebApp<{
    prenom: string;
    nomForfait: string;
    soinsInclus: string[];
    nombreSeances: number;
    prixFinal: number;
    dureeValiditeJours: number | null;
    moyenPaiementPropose: string;
    statut: string;
  }>("get-offer", { offerId, token });

export const respondToOffer = (offerId: string, token: string, response: "accept" | "decline") =>
  callWebApp<{ statut: string }>("respond-offer", { offerId, token, response });

// ─────────────────────────────────────────────────────────────────────────
//  Code promo (booking flow client, page /book-chelsea).
//  Valide le code pour un email donné et enregistre la réclamation.
//  Un code n'est valide qu'une seule fois par email.
// ─────────────────────────────────────────────────────────────────────────

// "percentage" (pas "percent") : doit correspondre exactement à
// PROMO_CODE_TYPE.PERCENTAGE côté GAS (Constants.gs) — c'est cette chaîne
// qui est stockée dans Promo_Codes.type et renvoyée telle quelle.
export const validatePromoCode = (email: string, promoCode: string, serviceId: string) =>
  callWebApp<{
    claimId: string;
    discountType: "fixed_amount" | "percentage";
    discountValue: number;
    message: string;
  }>("validate-promo", { email, promoCode, serviceId });

// ─────────────────────────────────────────────────────────────────────────
//  Portail admin (page /admin) — lecture seule. Le mot de passe est renvoyé
//  à chaque appel plutôt que via un jeton de session à durée de vie propre :
//  volontairement simple (un seul compte), vérifié côté serveur à chaque
//  fois, avec le même anti brute-force que le reste du site.
// ─────────────────────────────────────────────────────────────────────────

export type AdminUpcomingBooking = {
  serviceId: string;
  start: string;
  end: string;
  source: string;
  status: string;
};

export type AdminClientOverview = {
  clientId: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  packages: {
    packageName: string;
    availableSessions: number;
    totalSessions: number;
    dateExpiration: string;
  }[];
  // Rendez-vous à venir de la cliente : réservations forfait confirmées
  // (leur événement Google Calendar existe déjà — le portail n'est qu'une
  // vue) + réservations externes saisies manuellement (ClassPass/WhatsApp).
  upcomingBookings: AdminUpcomingBooking[];
  activePromoCodes: ActivePromoCode[];
};

export const adminGetClientsOverview = (adminPassword: string) =>
  callWebApp<AdminClientOverview[]>("admin-clients-overview", { adminPassword });

// Seule écriture du portail admin : créer un code promo, généralement réservé
// à une cliente précise (clientEmail vide = code générique). Le code créé
// apparaît aussitôt sur le tableau de bord /use-package de la cliente et
// s'applique à la saisie du paiement côté Sheet.
export const adminCreatePromoCode = (
  adminPassword: string,
  params: {
    clientEmail?: string;
    code?: string;
    discountType: "percentage" | "fixed_amount";
    discountValue: number;
    usageMax?: number;
    validityDays?: number;
    note?: string;
  }
) => callWebApp<{ code: string; clientId: string }>("admin-create-promo-code", { adminPassword, params });

// Identifiants stables des soins, utilisés aussi dans la colonne
// "soins_inclus" du Google Sheet — garder synchronisé avec Services.tsx.
export const PACKAGE_SERVICES: { id: string; label: string; durationMinutes: number }[] = [
  { id: "lymphatic-1z", label: "Lymphatic Drainage · 1 Zone", durationMinutes: 60 },
  { id: "lymphatic-2z", label: "Lymphatic Drainage · 2 Zones", durationMinutes: 90 },
  { id: "maderotherapy", label: "Maderotherapy", durationMinutes: 60 },
  { id: "post-op", label: "Post-Op Care", durationMinutes: 60 },
  { id: "prenatal", label: "Prenatal & Postnatal Massage", durationMinutes: 60 },
  { id: "cavitation", label: "Cavitation Fusion", durationMinutes: 90 },
];

