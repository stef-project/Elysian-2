/**
 * ============================================================================
 *  BuyPackageSuccess.tsx — Retour de Stripe Checkout après paiement.
 *  Route : /buy-package/success?session_id=...
 * ============================================================================
 *
 *  Ne fait confiance ni à la présence de cette page ni au session_id fourni :
 *  confirmCheckoutSession appelle le backend, qui revérifie directement
 *  auprès de Stripe avant de créer quoi que ce soit (voir Stripe.gs). Idempotent
 *  côté serveur — un rechargement de cette page ne crée jamais de doublon.
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { WHATSAPP_URL } from "../lib/booking";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { trackEvent } from "../lib/analytics";
import { confirmCheckoutSession } from "../lib/packageBooking";

type Step = "confirming" | "success" | "error";

export default function BuyPackageSuccess() {
  useDocumentMeta(
    "Payment Confirmation | Elysian Paris",
    "Confirming your package purchase at Elysian Paris."
  );

  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  const [step, setStep] = useState<Step>("confirming");
  const [error, setError] = useState("");
  const [packageName, setPackageName] = useState("");
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setError("Missing payment reference. Please contact us with your payment confirmation.");
      setStep("error");
      return;
    }
    (async () => {
      try {
        const res = await confirmCheckoutSession(sessionId);
        setPackageName(res.packageName);
        setTotalSessions(res.totalSessions);
        setStep("success");
        trackEvent("buy_package_success", { location: res.packageName });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue.");
        setStep("error");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-32 md:py-40 text-center">
        {step === "confirming" && (
          <p className="font-sans text-sm text-muted-foreground font-light">
            Confirming your payment…
          </p>
        )}

        {step === "success" && (
          <div>
            <div className="w-8 h-[1px] bg-primary mx-auto mb-8" />
            <p className="font-serif text-3xl text-[#1A1A1A] font-light mb-4">
              Payment confirmed.
            </p>
            <p className="font-sans text-sm text-muted-foreground font-light mb-2">
              {packageName} · {totalSessions} session{totalSessions !== 1 ? "s" : ""}
            </p>
            <p className="font-sans text-sm text-muted-foreground font-light mb-10">
              You will receive a confirmation email shortly. When you are ready to book, use the
              link in that email or the page below.
            </p>
            <Link
              href="/use-package"
              className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
            >
              Book your first session
            </Link>
          </div>
        )}

        {step === "error" && (
          <div>
            <p className="font-serif text-2xl text-[#1A1A1A] font-light mb-4">
              We could not confirm your payment automatically.
            </p>
            <p className="font-sans text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-8">
              {error}
            </p>
            <p className="font-sans text-sm text-muted-foreground font-light mb-8">
              If you have been charged, please message us and we will set up your package
              manually. No need to pay again.
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
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
