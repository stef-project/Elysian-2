import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { buildHealthCheckUrl } from "../../lib/contraindications";
import { isFlashOfferActive, FLASH_OFFER_DEADLINE } from "../../lib/flashOffer";
import { trackEvent, trackBookClick } from "../../lib/analytics";

// Jamais un lien direct vers Stripe — toujours via /health-check d'abord,
// même règle que tous les autres boutons "Book" du site.
const CLAIM_URL = buildHealthCheckUrl(
  "full-body-massage",
  "https://buy.stripe.com/7sY28rcca51ug8y3z3ew800"
);

// Mêmes pages exclues que NewsletterPopup — jamais pendant un parcours
// transactionnel en cours.
const HIDDEN_PATH_PREFIXES = [
  "/use-package",
  "/book-chelsea",
  "/health-check",
  "/buy-package",
  "/offer/",
  "/admin",
  "/book-abroad",
];

// sessionStorage (pas localStorage) : contrairement à la newsletter, cette
// offre est volontairement réaffichée à chaque nouvelle visite pendant sa
// courte durée de vie — juste pas plusieurs fois au sein de la même visite.
const SESSION_KEY = "elysian_flash_offer_dismissed";
const DELAY_MS = 4000;

// "00:00 Sunday" lit à la lettre prête à confusion (on croirait que l'offre
// couvre tout dimanche) — dans ce cas précis, on l'exprime comme "minuit
// samedi soir" (le jour précédent), qui désigne exactement le même instant
// sans ambiguïté.
const deadlineParts = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/London",
}).formatToParts(FLASH_OFFER_DEADLINE);
const deadlineHour = deadlineParts.find((p) => p.type === "hour")?.value;
const deadlineMinute = deadlineParts.find((p) => p.type === "minute")?.value;
const deadlineWeekday = deadlineParts.find((p) => p.type === "weekday")?.value;
const DEADLINE_LABEL =
  deadlineHour === "00" && deadlineMinute === "00"
    ? `${new Date(FLASH_OFFER_DEADLINE.getTime() - 60 * 1000).toLocaleDateString("en-GB", { weekday: "long", timeZone: "Europe/London" })} at midnight`
    : `${deadlineWeekday} at ${deadlineHour}:${deadlineMinute}`;

export function FlashOfferPopup() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isFlashOfferActive()) return;
    if (HIDDEN_PATH_PREFIXES.some((prefix) => location.startsWith(prefix))) return;
    let alreadyDismissed = false;
    try {
      alreadyDismissed = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Stockage indisponible : on se comporte comme si jamais fermée.
    }
    if (alreadyDismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
      trackEvent("flash_offer_view");
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [location]);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Rien à faire : au pire, elle la reverra une fois de plus.
    }
    trackEvent("flash_offer_dismiss");
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Limited-time offer"
      className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 sm:w-full sm:max-w-sm bg-[#1A1A1A] text-[#F7F5F2] shadow-2xl border border-[#BF944A]/40 p-6"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="absolute top-4 right-4 text-[#F7F5F2]/40 hover:text-[#F7F5F2] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      <div className="pr-4">
        <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#BF944A] mb-2">
          Limited-time offer
        </p>
        <p className="font-serif text-lg text-[#F7F5F2] font-light mb-1">
          5 Full-Body Massages
        </p>
        <p className="font-serif text-2xl text-[#BF944A] font-light mb-3">
          &pound;500
        </p>
        <p className="font-sans text-[11px] tracking-[0.1em] uppercase text-[#F7F5F2]/80 font-light mb-3">
          Only 5 spots available
        </p>
        <p className="font-sans text-xs text-[#F7F5F2]/60 font-light leading-relaxed mb-5">
          Ends {DEADLINE_LABEL}.
        </p>
        <a
          href={CLAIM_URL}
          onClick={() => trackBookClick("flash_offer_popup")}
          className="block text-center w-full font-sans text-[11px] tracking-[0.15em] uppercase bg-[#BF944A] text-[#1A1A1A] px-5 py-3 hover:bg-[#E2CAA2] transition-colors duration-300"
        >
          Claim this offer
        </a>
      </div>
    </div>
  );
}
