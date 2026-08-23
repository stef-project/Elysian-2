/**
 * ============================================================================
 *  HealthCheck.tsx — Passage obligé avant toute réservation externe (Google
 *  Calendar). Route : /health-check?service=<clé>&next=<url encodée>
 * ============================================================================
 *
 *  Les soins ponctuels (hors forfait) sont réservés sur des Appointment
 *  Schedules Google Calendar, hors de notre contrôle — impossible d'y
 *  ajouter une case à cocher directement. Cette page s'intercale donc entre
 *  le clic "Reserve" et le calendrier réel : tant que la case n'est pas
 *  cochée, aucun lien vers le calendrier n'est cliquable.
 */

import { useState, useEffect } from "react";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { ContraindicationsCheck } from "../components/booking/ContraindicationsCheck";
import { TREATMENT_LABELS } from "../lib/contraindications";
import { trackBookClick, trackEvent } from "../lib/analytics";
import { useDocumentMeta } from "../lib/useDocumentMeta";

// "next" arrive dans l'URL (query string) — jamais fait confiance sans
// vérification : n'importe qui peut fabriquer un lien vers CETTE page (sur
// notre propre domaine, donc d'apparence légitime) avec un "next" pointant
// n'importe où, et l'envoyer dans un message de phishing. Seuls les domaines
// de calendrier réels sont acceptés ; tout le reste est traité comme absent.
const ALLOWED_NEXT_ORIGINS = ["https://calendar.app.google", "https://calendar.google.com"];

function sanitizeNextUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return ALLOWED_NEXT_ORIGINS.some((origin) => url.href.startsWith(origin)) ? url.href : "";
  } catch {
    return "";
  }
}

export default function HealthCheck() {
  const params = new URLSearchParams(window.location.search);
  const treatmentKey = params.get("service") ?? "";
  const nextUrl = sanitizeNextUrl(params.get("next") ?? "");
  const label = TREATMENT_LABELS[treatmentKey] ?? "Your Treatment";

  useDocumentMeta(
    "Before You Book | Elysian Paris",
    "A quick health and safety check before booking your treatment at Elysian Paris."
  );

  // Page transactionnelle : jamais indexée, même principe que /book-chelsea.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  const [checked, setChecked] = useState(false);

  // Sans ceci, seul le clic final ("Continue to booking") est mesuré — donc
  // aucun moyen de savoir combien de clientes voient cette étape puis
  // repartent sans cocher (abandon), par rapport à celles qui vont jusqu'au
  // bout. "view" une fois au montage ; "confirmed" la première fois que la
  // case est cochée (jamais répété si elle la coche/décoche plusieurs fois).
  useEffect(() => {
    trackEvent("health_check_view", { location: treatmentKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckedChange = (value: boolean) => {
    setChecked(value);
    if (value) trackEvent("health_check_confirmed", { location: treatmentKey });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-28 md:py-36">
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
          {label}
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-10">
          A quick check before booking
        </h1>

        <div className="mb-8">
          <ContraindicationsCheck treatmentKey={treatmentKey} checked={checked} onCheckedChange={handleCheckedChange} />
        </div>

        {nextUrl ? (
          <a
            href={checked ? nextUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!checked}
            onClick={(e) => {
              if (!checked) {
                e.preventDefault();
                return;
              }
              trackBookClick(`health_check_${treatmentKey}`);
            }}
            className={`block w-full text-center font-sans text-xs tracking-[0.2em] uppercase px-10 py-4 transition-colors duration-300 ${
              checked
                ? "bg-[#1A1A1A] text-[#F7F5F2] hover:bg-primary cursor-pointer"
                : "bg-[#1A1A1A]/20 text-[#1A1A1A]/40 cursor-not-allowed"
            }`}
          >
            Continue to booking →
          </a>
        ) : (
          <p className="font-sans text-sm text-red-700">
            Missing booking link. Please go back and try again.
          </p>
        )}
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
