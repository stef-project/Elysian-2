/**
 * ============================================================================
 *  BookSession.tsx — Achat en ligne d'une séance unique, sans forfait
 *  (Stripe Checkout). Route : /book-session
 * ============================================================================
 *
 *  Même flow que BuyPackage.tsx, pour un soin à l'unité plutôt qu'un forfait.
 *  Le prix affiché est toujours celui du catalogue ; le serveur le
 *  revérifie lui-même à la création de la session, et ajuste automatiquement
 *  au tarif parrainage si "Referred by" correspond à une cliente existante
 *  (voir package-booking/TOUT-EN-UN.gs, resolveReferralTag_).
 */

import { useState, useEffect } from "react";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { WHATSAPP_URL } from "../lib/booking";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { trackEvent } from "../lib/analytics";
import {
  isPackageBookingConfigured,
  listTreatmentPrices,
  createSingleSessionCheckoutSession,
  type PublicTreatmentPrice,
} from "../lib/packageBooking";

type Step = "loading" | "browse" | "form" | "redirecting" | "empty" | "unavailable";

export default function BookSession() {
  useDocumentMeta(
    "Book a Session | Elysian Paris",
    "Book a single treatment at Elysian Paris and pay securely online."
  );

  // Page transactionnelle : jamais indexée, même principe que /buy-package et /use-package.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  const [step, setStep] = useState<Step>(isPackageBookingConfigured() ? "loading" : "unavailable");
  const [treatments, setTreatments] = useState<PublicTreatmentPrice[]>([]);
  const [selected, setSelected] = useState<PublicTreatmentPrice | null>(null);
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [referredByName, setReferredByName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Stripe redirige ici (cancel_url) si la cliente quitte le paiement sans
  // payer — même principe que BuyPackage.tsx.
  const [cameFromCancelledCheckout] = useState(
    () => new URLSearchParams(window.location.search).get("cancelled") === "1"
  );

  useEffect(() => {
    if (step !== "loading") return;
    (async () => {
      try {
        const res = await listTreatmentPrices();
        setTreatments(res);
        setStep(res.length === 0 ? "empty" : "browse");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue.");
        setStep("empty");
      }
    })();
  }, [step]);

  function choose(treatment: PublicTreatmentPrice) {
    setSelected(treatment);
    setError("");
    setStep("form");
    trackEvent("book_session_select", { location: treatment.serviceId });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError("");

    const trimmedEmail = email.trim();
    const trimmedPrenom = prenom.trim();
    if (!trimmedEmail || !trimmedPrenom) {
      setError("Please enter your first name and email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await createSingleSessionCheckoutSession(
        selected.serviceId,
        trimmedEmail,
        trimmedPrenom,
        nom.trim(),
        referredByName.trim() || undefined
      );
      trackEvent("book_session_checkout", { location: selected.serviceId });
      setStep("redirecting");
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setLoading(false);
    }
  }

  if (step === "unavailable") {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <TopBar />
        <Navbar />
        <main className="max-w-xl mx-auto px-6 py-32 text-center">
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Book a Session
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-6">
            This service is not yet available online.
          </h1>
          <p className="font-sans text-muted-foreground font-light mb-10">
            To book a session, please contact us directly.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
          >
            Message us on WhatsApp
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-28 md:py-36">
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
          Book a Session
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-10">
          {step === "form" && selected ? selected.label : "Choose your treatment"}
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {cameFromCancelledCheckout && step !== "form" && (
          <div className="mb-6 p-4 bg-[#F0EBE1] border border-[#BF944A]/40 text-sm text-[#1A1A1A]">
            Payment was not completed — you have not been charged. Feel free to try again.
          </div>
        )}

        {step === "loading" && (
          <p className="font-sans text-sm text-muted-foreground font-light">Loading treatments…</p>
        )}

        {step === "empty" && (
          <div className="text-center py-6">
            <p className="font-sans text-sm text-muted-foreground font-light mb-8">
              No treatments are available for online booking at the moment. Please contact us
              directly and we will arrange one for you.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
            >
              Message us on WhatsApp
            </a>
          </div>
        )}

        {step === "browse" && (
          <div className="space-y-4">
            {treatments.map((t) => (
              <button
                key={t.serviceId}
                onClick={() => choose(t)}
                className="w-full text-left border border-[#D4C9BD] bg-[#FAFAF9] px-6 py-5 hover:border-[#BF944A] transition-colors"
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-serif text-lg text-[#1A1A1A]">{t.label}</span>
                  <span className="font-serif text-xl text-[#1A1A1A]">£{t.priceNormal}</span>
                </div>
                <p className="font-sans text-[11px] tracking-[0.1em] uppercase text-[#BF944A]">
                  {t.durationMinutes} min
                </p>
              </button>
            ))}
          </div>
        )}

        {(step === "form" || step === "redirecting") && selected && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="border border-[#D4C9BD] bg-[#FAFAF9] px-6 py-5 mb-2">
              <div className="flex justify-between items-baseline">
                <span className="font-sans text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {selected.durationMinutes} min
                </span>
                <span className="font-serif text-2xl text-[#1A1A1A]">£{selected.priceNormal}</span>
              </div>
            </div>

            <div>
              <label htmlFor="prenom" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
                First name
              </label>
              <input
                id="prenom"
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] focus:outline-none focus:border-[#BF944A] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="nom" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
                Last name{" "}
                <span className="font-sans text-[10px] normal-case tracking-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] focus:outline-none focus:border-[#BF944A] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#BF944A] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="referredBy" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
                Referred by{" "}
                <span className="font-sans text-[10px] normal-case tracking-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="referredBy"
                type="text"
                value={referredByName}
                onChange={(e) => setReferredByName(e.target.value)}
                placeholder="Full name of the client who referred you"
                className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#BF944A] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === "redirecting" ? "Redirecting to payment…" : loading ? "Please wait…" : "Continue to payment"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("browse"); setError(""); }}
              className="w-full font-sans text-[10px] text-muted-foreground underline underline-offset-2"
            >
              Choose a different treatment
            </button>
          </form>
        )}
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
