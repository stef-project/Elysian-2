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

// Erreur MÉTIER renvoyée par le backend (success: false) : le serveur a
// répondu, l'issue de la requête est donc connue avec certitude — contrairement
// aux erreurs réseau/parsing (Error générique) où la requête a pu aboutir côté
// serveur sans qu'on reçoive la réponse. Cette distinction permet par exemple
// de régénérer un booking_request_id après un échec métier (rien n'a été créé
// sous cet identifiant) tout en le CONSERVANT après une erreur réseau (un
// retry avec le même identifiant renverra le résultat déjà obtenu, sans
// jamais créer de doublon — c'est le rôle de l'idempotence).
export class ApiBusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiBusinessError";
  }
}

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
    throw new ApiBusinessError(json.error);
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

// /use-package : aucun créneau libre sur toute la fenêtre de réservation
// pour ce soin — la cliente demande à être prévenue dès qu'un créneau se
// libère, au lieu de repartir sans solution. durationMinutes est stocké
// côté serveur pour la vérification périodique de disponibilité
// (checkWaitlistAvailability_, Notifications.gs).
export const joinWaitlist = (sessionToken: string, serviceId: string, durationMinutes: number) =>
  callWebApp<{ status: "joined" | "already_on_waitlist" }>("join-waitlist", {
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
    eligibleServices: string[];
  }>("get-client-dashboard", { sessionToken });

// "Log out of this device" (/use-package) : invalide le jeton côté serveur en
// plus de le retirer du localStorage — sinon "se déconnecter" ne protégeait
// rien de plus que ce navigateur, le jeton restant utilisable ailleurs.
export const revokeSession = (sessionToken: string) =>
  callWebApp<Record<string, never>>("revoke-session", { sessionToken });

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
    // "active" ou "pending_payment" — un forfait en attente de paiement est
    // affiché (utile pour relancer) mais n'est jamais réservable côté GAS.
    statut: string;
  }[];
  // Rendez-vous à venir de la cliente : réservations forfait confirmées
  // (leur événement Google Calendar existe déjà — le portail n'est qu'une
  // vue) + réservations externes saisies manuellement (ClassPass/WhatsApp).
  upcomingBookings: AdminUpcomingBooking[];
  // Les 5 paiements les plus récents — uniquement ceux enregistrés dans le
  // système (les paiements Stripe des Appointment Schedules restent hors
  // système). L'historique complet reste dans la Fiche_Client côté Sheet.
  payments: {
    date: string;
    montantBrut: number;
    montantNet: number;
    devise: string;
    moyen: string;
    statut: string;
    packageId: string;
  }[];
  totalNetConfirmed: number;
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

// Annule un code promo actif depuis le portail admin. ⚠️ Un code générique
// annulé ici l'est pour toutes les clientes — demander confirmation avant.
export const adminCancelPromoCode = (adminPassword: string, code: string) =>
  callWebApp<{ code: string }>("admin-cancel-promo-code", { adminPassword, params: { code } });

// Crée une cliente depuis le portail admin (le parrainage reste côté Sheet).
export const adminAddClient = (
  adminPassword: string,
  params: { prenom: string; nom: string; email: string; telephone?: string }
) => callWebApp<{ clientId: string }>("admin-add-client", { adminPassword, params });

// Attribue un forfait immédiatement actif (réservable, synchro Calendar).
// amountPaid optionnel : renseigné → paiement enregistré avec le vrai montant
// (CA du tableau de bord juste) ; vide → trace neutre à 0, suivi hors système.
export const adminAddPackage = (
  adminPassword: string,
  params: {
    clientEmail: string;
    packageName: string;
    servicesIncluded: string[];
    totalSessions: number;
    availableSessions?: number | "";
    expirationDate?: string;
    amountPaid?: number | "";
    paymentMethod?: string;
  }
) => callWebApp<{ packageId: string }>("admin-add-package", { adminPassword, params });

// Moyens de paiement reconnus côté GAS (Payments.moyen_paiement) — garder
// synchronisé avec PAYMENT_METHOD (Constants.gs).
export const PAYMENT_METHODS: { id: string; label: string }[] = [
  { id: "revolut_card_payment", label: "Revolut card" },
  { id: "revolut_pay", label: "Revolut Pay" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "stripe", label: "Stripe" },
  { id: "classpass", label: "ClassPass" },
  { id: "card_in_person", label: "Card in person" },
  { id: "cash", label: "Cash" },
  { id: "other", label: "Other" },
];

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

// ─────────────────────────────────────────────────────────────────────────
//  Achat en ligne d'un forfait publié (Stripe Checkout) — page /buy-package.
//  Le prix affiché est toujours celui du catalogue (prix_public,
//  Package_Templates) : jamais recalculé côté client, jamais envoyé au
//  serveur — seul templateId l'est, le serveur retrouve le prix lui-même.
// ─────────────────────────────────────────────────────────────────────────

export type PublicPackageTemplate = {
  templateId: string;
  nom: string;
  description: string;
  soinsInclus: string[];
  nombreSeances: number;
  prixPublic: number;
  dureeValiditeJours: number | null;
};

export const listPublicPackages = () =>
  callWebApp<PublicPackageTemplate[]>("list-public-packages", {});

export const createCheckoutSession = (templateId: string, email: string, prenom: string, nom: string) =>
  callWebApp<{ checkoutUrl: string }>("create-checkout-session", { templateId, email, prenom, nom });

export const confirmCheckoutSession = (sessionId: string) =>
  callWebApp<{ packageName: string; totalSessions: number }>("confirm-checkout-session", { sessionId });

// ─────────────────────────────────────────────────────────────────────────
//  Demande de forfait sans email connu (onglet "Register my package" de
//  /use-package, UsePackage.tsx). Pour une cliente dont le forfait a été
//  vendu avant ce système (email jamais collecté) : /use-package ne peut lui
//  envoyer aucun code tant que l'admin n'a pas validé sa demande depuis le
//  portail (voir AdminPortal.tsx).
// ─────────────────────────────────────────────────────────────────────────

export const submitPackageClaim = (
  email: string,
  prenom: string,
  nom: string,
  telephone: string,
  message: string
) => callWebApp<{ message: string }>("submit-package-claim", { email, prenom, nom, telephone, message });

export type PackageClaim = {
  claimId: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  message: string;
  createdAt: string;
};

export const adminListPackageClaims = (adminPassword: string) =>
  callWebApp<PackageClaim[]>("admin-list-package-claims", { adminPassword });

export const adminApprovePackageClaim = (
  adminPassword: string,
  params: {
    claimId: string;
    packageName: string;
    servicesIncluded: string[];
    totalSessions: number;
    availableSessions?: number | "";
    expirationDate?: string;
    amountPaid?: number | "";
    paymentMethod?: string;
  }
) => callWebApp<{ packageId: string; clientId: string }>("admin-approve-package-claim", { adminPassword, params });

export const adminRejectPackageClaim = (adminPassword: string, claimId: string, reason?: string) =>
  callWebApp<{ claimId: string }>("admin-reject-package-claim", { adminPassword, params: { claimId, reason } });

