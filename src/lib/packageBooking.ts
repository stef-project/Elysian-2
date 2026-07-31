// ─────────────────────────────────────────────────────────────────────────
//  Client pour la Web App Apps Script "réservation par forfait".
//  ⚠️ Aucun secret ici : uniquement l'URL publique du endpoint (le Web App
//     lui-même est protégé par vérification email + code, pas par le secret
//     de cette URL — voir package-booking/WebApp.gs et README.md).
// ─────────────────────────────────────────────────────────────────────────

export const PACKAGE_BOOKING_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyF9qnNiaTGdkHGNeRVhGg8R7N1OgcyiRzNsPMPfSdx5WvirrvGcoQl-8enpY-lbvJ8gA/exec";

export const isPackageBookingConfigured = () => PACKAGE_BOOKING_WEB_APP_URL.length > 0;

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

// Content-Type volontairement "text/plain" : évite le preflight CORS que les
// Web Apps Apps Script ne savent pas gérer. Le corps reste du JSON valide.
async function callWebApp<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!isPackageBookingConfigured()) {
    throw new Error("Ce service n'est pas encore disponible. Merci de nous contacter directement.");
  }
  const res = await fetch(PACKAGE_BOOKING_WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = (await res.json()) as ApiResponse<T>;
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

// Identifiants stables des soins, utilisés aussi dans la colonne
// "soins_inclus" du Google Sheet — garder synchronisé avec Services.tsx.
export const PACKAGE_SERVICES: { id: string; label: string; durationMinutes: number }[] = [
  { id: "lymphatic-1z", label: "Lymphatic Drainage — 1 Zone", durationMinutes: 60 },
  { id: "lymphatic-2z", label: "Lymphatic Drainage — 2 Zones", durationMinutes: 90 },
  { id: "maderotherapy", label: "Maderotherapy", durationMinutes: 60 },
  { id: "post-op", label: "Post-Operative Care", durationMinutes: 60 },
  { id: "prenatal", label: "Prenatal & Postnatal Massage", durationMinutes: 60 },
  { id: "cavitation", label: "Cavitation Fusion", durationMinutes: 90 },
];

