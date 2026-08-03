/**
 * ============================================================================
 *  BookChelsea.tsx — Page de réservation Chelsea avec code promo optionnel.
 *  Route : /book-chelsea
 * ============================================================================
 *
 *  Flow :
 *  1. Client saisit son email + le code promo (optionnel)
 *  2. Si code → validation temps réel contre le GAS (valide une fois par email)
 *  3. Redirection vers Google Calendar Chelsea (Stripe £50 acompte intégré)
 *  4. Dans le Sheet : onglet Promo_Code_Claims → admin voit immédiatement
 *     qui a utilisé quel code, statut "pending" jusqu'à confirmation manuelle.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { CHELSEA_BOOKING_URL } from "../lib/booking";
import { validatePromoCode } from "../lib/packageBooking";

const SERVICE_ID = "lymphatic-1z";
const FULL_PRICE = 120;
const DEPOSIT = 50;

type Step = "form" | "code-valid" | "error";

export default function BookChelsea() {
  useDocumentMeta(
    "Book Chelsea | Elysian Paris",
    "Book your Lymphatic Drainage session at Elysian Paris Chelsea. Every Friday on the King's Road."
  );

  const [, setLocation] = useLocation();

  // Pré-remplissage du code si passé en ?code= dans l'URL (lien Vivi)
  const [promoCode, setPromoCode] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [discount, setDiscount] = useState<{
    type: "fixed_amount" | "percentage";
    value: number;
    finalPrice: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    if (codeParam) setPromoCode(codeParam.toUpperCase());
  }, []);

  function computeFinalPrice(type: "fixed_amount" | "percentage", value: number): number {
    if (type === "fixed_amount") return Math.max(0, FULL_PRICE - value);
    if (type === "percentage") return Math.max(0, FULL_PRICE * (1 - value / 100));
    return FULL_PRICE;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const trimmedEmail = email.trim();
    const trimmedCode = promoCode.trim().toUpperCase();

    if (!trimmedEmail) {
      setErrorMsg("Merci de renseigner votre adresse email.");
      return;
    }

    // Pas de code → redirection directe
    if (!trimmedCode) {
      window.open(CHELSEA_BOOKING_URL, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);
    try {
      const result = await validatePromoCode(trimmedEmail, trimmedCode, SERVICE_ID);
      const finalPrice = computeFinalPrice(result.discountType, result.discountValue);
      setDiscount({ type: result.discountType, value: result.discountValue, finalPrice });
      setStep("code-valid");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  function proceedToCalendar() {
    window.open(CHELSEA_BOOKING_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar location="Chelsea, London" />
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-32 md:py-40">
        {/* En-tête */}
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4 text-center">
          Weekly Studio · King's Road
        </p>
        <h1 className="font-serif text-3xl md:text-5xl text-[#1A1A1A] font-light leading-tight mb-4 text-center">
          Book Chelsea
        </h1>
        <p className="font-sans text-sm text-muted-foreground font-light mb-2 text-center">
          Lymphatic Drainage, Post-Op, Pre/Postnatal
        </p>
        <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#BF944A] mb-10 text-center">
          Every Friday · 60 min
        </p>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2"
              >
                Your email address
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

            {/* Code promo */}
            <div>
              <label
                htmlFor="promo"
                className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2"
              >
                Promo code{" "}
                <span className="font-sans text-[10px] normal-case tracking-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <input
                id="promo"
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="e.g. VIVI08"
                className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] uppercase placeholder:text-muted-foreground/50 placeholder:normal-case focus:outline-none focus:border-[#BF944A] transition-colors tracking-widest"
              />
            </div>

            {/* Erreur */}
            {errorMsg && (
              <p className="font-sans text-xs text-red-600">{errorMsg}</p>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Validating…"
                : promoCode.trim()
                ? "Validate code & book"
                : "Book my Friday slot"}
            </button>
          </form>
        )}

        {/* Étape 2 : code valide → confirmation + redirect */}
        {step === "code-valid" && discount && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#F0EBE1] px-5 py-3">
              <span className="text-[#BF944A] text-lg">✓</span>
              <span className="font-sans text-xs tracking-[0.15em] uppercase text-[#BF944A]">
                Code {promoCode} applied
              </span>
            </div>

            {/* Récap tarif */}
            <div className="border border-[#D4C9BD] p-6 text-left space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="font-sans text-xs text-muted-foreground uppercase tracking-[0.1em]">
                  Session price
                </span>
                <span className="font-sans text-sm line-through text-muted-foreground">
                  £{FULL_PRICE}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-sans text-xs text-[#BF944A] uppercase tracking-[0.1em]">
                  Discount ({promoCode})
                </span>
                <span className="font-sans text-sm text-[#BF944A]">
                  −£
                  {discount.type === "fixed_amount"
                    ? discount.value
                    : Math.round(FULL_PRICE * discount.value / 100)}
                </span>
              </div>
              <div className="border-t border-[#E8E0D6] pt-3 flex justify-between items-baseline">
                <span className="font-sans text-xs uppercase tracking-[0.1em] text-[#1A1A1A]">
                  Your price
                </span>
                <span className="font-serif text-2xl text-[#1A1A1A]">
                  £{discount.finalPrice}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-sans text-xs text-muted-foreground uppercase tracking-[0.1em]">
                  Deposit (taken online)
                </span>
                <span className="font-sans text-sm text-[#1A1A1A]">£{DEPOSIT}</span>
              </div>
            </div>

            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              Your promo code has been saved. Click below to choose your Friday
              slot on Google Calendar. Your £{DEPOSIT} deposit will be taken at
              that step, and the balance of £{Math.max(0, discount.finalPrice - DEPOSIT)}{" "}
              is payable at the studio.
            </p>

            <button
              onClick={proceedToCalendar}
              className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
            >
              Choose my Friday slot →
            </button>

            <button
              onClick={() => { setStep("form"); setErrorMsg(""); }}
              className="font-sans text-[10px] text-muted-foreground underline underline-offset-2"
            >
              Go back
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
