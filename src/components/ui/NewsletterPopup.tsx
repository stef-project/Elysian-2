import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { subscribeToNewsletter } from "../../lib/packageBooking";
import { trackNewsletterView, trackNewsletterDismiss, trackNewsletterSubscribe } from "../../lib/analytics";

// Jamais montré pendant un parcours transactionnel en cours (réservation,
// achat, vérification de dossier) — uniquement sur les pages de découverte.
const HIDDEN_PATH_PREFIXES = [
  "/use-package",
  "/book-chelsea",
  "/health-check",
  "/buy-package",
  "/offer/",
  "/admin",
  "/book-abroad",
];

// Une seule fois par navigateur, qu'elle s'inscrive ou ferme la popup —
// jamais reproposée à chaque visite.
const STORAGE_KEY = "elysian_newsletter_popup_seen";
const DELAY_MS = 6000;

// Code générique à créer une fois côté Sheet (menu Elysian Admin > Croissance
// clientèle > Créer un code promo), sans cliente précise, type "percentage",
// valeur 10 — voir package-booking/README.md. Affiché ici tel quel : ce
// composant ne crée ni ne valide rien côté serveur, il ne fait qu'informer.
const WELCOME_CODE = "WELCOME10";

export function NewsletterPopup() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (HIDDEN_PATH_PREFIXES.some((prefix) => location.startsWith(prefix))) return;
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Stockage indisponible (navigation privée stricte, etc.) : on se
      // comporte comme si jamais vue, plutôt que de bloquer l'affichage.
    }
    if (alreadySeen) return;

    const timer = setTimeout(() => {
      setVisible(true);
      trackNewsletterView("popup");
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [location]);

  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Rien à faire : au pire, elle la reverra une fois de plus.
    }
  }

  function dismiss() {
    setVisible(false);
    markSeen();
    trackNewsletterDismiss("popup");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await subscribeToNewsletter(email);
      setStatus("done");
      markSeen();
      trackNewsletterSubscribe("popup");
    } catch {
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Newsletter signup"
      className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 sm:w-full sm:max-w-sm bg-[#1A1A1A] text-[#F7F5F2] shadow-2xl border border-[#F7F5F2]/10 p-6"
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

      {status === "done" ? (
        <div className="pr-4">
          <p className="font-serif text-xl text-[#F7F5F2] font-light mb-3">Welcome.</p>
          <p className="font-sans text-sm text-[#F7F5F2]/60 font-light leading-relaxed mb-4">
            Here's your code for 10% off your first treatment:
          </p>
          <p className="font-sans text-lg tracking-[0.3em] text-[#BF944A]">{WELCOME_CODE}</p>
          <p className="font-sans text-[11px] text-[#F7F5F2]/40 font-light mt-4">
            Mention it when you book or pay.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="pr-4">
          <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#BF944A] mb-2">
            Welcome offer
          </p>
          <p className="font-serif text-lg text-[#F7F5F2] font-light mb-4">
            10% off your first treatment
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              required
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 min-w-0 bg-transparent border border-[#F7F5F2]/20 px-3 py-2.5 font-sans text-xs text-[#F7F5F2] placeholder:text-[#F7F5F2]/30 focus:outline-none focus:border-[#BF944A] transition-colors"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="font-sans text-[11px] tracking-[0.15em] uppercase bg-[#BF944A] text-[#1A1A1A] px-4 py-2.5 hover:bg-[#E2CAA2] transition-colors duration-300 disabled:opacity-50 whitespace-nowrap"
            >
              {status === "loading" ? "..." : "Get code"}
            </button>
          </div>
          {status === "error" && (
            <p className="font-sans text-[11px] text-[#F7F5F2]/40 mt-3">
              Something went wrong, please try again.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
