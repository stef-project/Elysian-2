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
import { trackBookClick } from "../lib/analytics";
import { ContraindicationsCheck } from "../components/booking/ContraindicationsCheck";

// Les 3 soins réellement proposés sur le créneau Chelsea, avec leur tarif
// respectif — ids alignés sur PACKAGE_SERVICES (packageBooking.ts). La clé
// de contre-indications correspondante (src/lib/contraindications.ts) n'est
// pas toujours identique à l'id du soin.
const TREATMENTS = [
  { id: "lymphatic-1z", label: "Lymphatic Drainage", price: 120, contraindicationKey: "lymphatic-drainage" },
  { id: "post-op", label: "Post-Op Care", price: 80, contraindicationKey: "post-op" },
  { id: "prenatal", label: "Prenatal & Postnatal Massage", price: 80, contraindicationKey: "prenatal-postnatal" },
] as const;

const DEPOSIT = 50;

type Step = "form" | "code-valid" | "error";

export default function BookChelsea() {
  useDocumentMeta(
    "Book Chelsea | Elysian Paris",
    "Book your Lymphatic Drainage session at Elysian Paris Chelsea. Every Friday on the King's Road."
  );

  // Page de réservation transactionnelle (email, code promo) : jamais
  // indexée, même si l'URL fuite — même principe que /use-package, /admin
  // et /offer/:offerId.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  const [, setLocation] = useLocation();

  // Pré-remplissage du code si passé en ?code= dans l'URL (lien Vivi)
  const [promoCode, setPromoCode] = useState("");
  const [email, setEmail] = useState("");
  const [treatmentId, setTreatmentId] = useState<string>(TREATMENTS[0].id);
  const [step, setStep] = useState<Step>("form");
  const [discount, setDiscount] = useState<{
    type: "fixed_amount" | "percentage";
    value: number;
    finalPrice: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [healthChecked, setHealthChecked] = useState(false);

  const treatment = TREATMENTS.find((t) => t.id === treatmentId) ?? TREATMENTS[0];

  // La case décochée si on change de soin — les contre-indications ne sont
  // pas les mêmes d'un traitement à l'autre, mieux vaut la faire relire.
  useEffect(() => {
    setHealthChecked(false);
  }, [treatmentId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    if (codeParam) setPromoCode(codeParam.toUpperCase());
  }, []);

  function computeFinalPrice(type: "fixed_amount" | "percentage", value: number, fullPrice: number): number {
    if (type === "fixed_amount") return Math.max(0, fullPrice - value);
    if (type === "percentage") return Math.max(0, fullPrice * (1 - value / 100));
    return fullPrice;
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
    if (!healthChecked) {
      setErrorMsg("Please confirm the health check above before booking.");
      return;
    }

    // Pas de code → redirection directe
    if (!trimmedCode) {
      trackBookClick("book_chelsea_calendar");
      window.open(CHELSEA_BOOKING_URL, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);
    try {
      const result = await validatePromoCode(trimmedEmail, trimmedCode, treatmentId);
      const finalPrice = computeFinalPrice(result.discountType, result.discountValue, treatment.price);
      setDiscount({ type: result.discountType, value: result.discountValue, finalPrice });
      setStep("code-valid");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  function proceedToCalendar() {
    trackBookClick("book_chelsea_calendar");
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
            {/* Choix du soin */}
            <div>
              <label className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
                Choose your treatment
              </label>
              <div className="space-y-2">
                {TREATMENTS.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center justify-between border px-4 py-3 cursor-pointer transition-colors ${
                      treatmentId === t.id
                        ? "border-[#BF944A] bg-[#F0EBE1]"
                        : "border-[#D4C9BD] bg-[#FAFAF9] hover:border-[#BF944A]/50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="treatment"
                        value={t.id}
                        checked={treatmentId === t.id}
                        onChange={() => setTreatmentId(t.id)}
                        className="accent-[#BF944A]"
                      />
                      <span className="font-sans text-sm text-[#1A1A1A]">{t.label}</span>
                    </span>
                    <span className="font-serif text-base text-[#1A1A1A]">£{t.price}</span>
                  </label>
                ))}
              </div>
            </div>

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
                placeholder="Enter your code"
                className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] uppercase placeholder:text-muted-foreground/50 placeholder:normal-case focus:outline-none focus:border-[#BF944A] transition-colors tracking-widest"
              />
            </div>

            {/* Contre-indications */}
            <ContraindicationsCheck
              treatmentKey={treatment.contraindicationKey}
              checked={healthChecked}
              onCheckedChange={setHealthChecked}
            />

            {/* Erreur */}
            {errorMsg && (
              <p className="font-sans text-xs text-red-600">{errorMsg}</p>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={loading || !healthChecked}
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
                  {treatment.label}
                </span>
                <span className="font-sans text-sm line-through text-muted-foreground">
                  £{treatment.price}
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
                    : Math.round(treatment.price * discount.value / 100)}
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
