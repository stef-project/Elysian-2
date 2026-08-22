/**
 * ============================================================================
 *  BuyPackage.tsx — Achat en ligne d'un forfait publié (Stripe Checkout).
 *  Route : /buy-package
 * ============================================================================
 *
 *  Flow : la cliente parcourt le catalogue des forfaits publiés (Package_
 *  Templates, visibilite=public), en choisit un, saisit ses coordonnées, puis
 *  est redirigée vers la page de paiement hébergée par Stripe — aucune donnée
 *  de carte ne transite jamais par ce site. Le prix affiché est toujours
 *  celui du catalogue ; le serveur le revérifie lui-même à la création de la
 *  session (voir package-booking/Stripe.gs).
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
  listPublicPackages,
  createCheckoutSession,
  type PublicPackageTemplate,
} from "../lib/packageBooking";

type Step = "loading" | "browse" | "form" | "redirecting" | "empty" | "unavailable";

export default function BuyPackage() {
  useDocumentMeta(
    "Buy a Package | Elysian Paris",
    "Choose a treatment package at Elysian Paris and pay securely online."
  );

  // Page transactionnelle : jamais indexée, même principe que /use-package et /book-chelsea.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  const [step, setStep] = useState<Step>(isPackageBookingConfigured() ? "loading" : "unavailable");
  const [templates, setTemplates] = useState<PublicPackageTemplate[]>([]);
  const [selected, setSelected] = useState<PublicPackageTemplate | null>(null);
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step !== "loading") return;
    (async () => {
      try {
        const res = await listPublicPackages();
        setTemplates(res);
        setStep(res.length === 0 ? "empty" : "browse");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue.");
        setStep("empty");
      }
    })();
  }, [step]);

  function choose(template: PublicPackageTemplate) {
    setSelected(template);
    setError("");
    setStep("form");
    trackEvent("buy_package_select", { location: template.templateId });
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
      const res = await createCheckoutSession(selected.templateId, trimmedEmail, trimmedPrenom, nom.trim());
      trackEvent("buy_package_checkout", { location: selected.templateId });
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
            Packages
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-6">
            This service is not yet available online.
          </h1>
          <p className="font-sans text-muted-foreground font-light mb-10">
            To purchase a package, please contact us directly.
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
          Packages
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-10">
          {step === "form" && selected ? selected.nom : "Choose your package"}
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "loading" && (
          <p className="font-sans text-sm text-muted-foreground font-light">Loading packages…</p>
        )}

        {step === "empty" && (
          <div className="text-center py-6">
            <p className="font-sans text-sm text-muted-foreground font-light mb-8">
              No packages are available for online purchase at the moment. Please contact us
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
            {templates.map((t) => (
              <button
                key={t.templateId}
                onClick={() => choose(t)}
                className="w-full text-left border border-[#D4C9BD] bg-[#FAFAF9] px-6 py-5 hover:border-[#BF944A] transition-colors"
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-serif text-lg text-[#1A1A1A]">{t.nom}</span>
                  <span className="font-serif text-xl text-[#1A1A1A]">£{t.prixPublic}</span>
                </div>
                {t.description && (
                  <p className="font-sans text-xs text-muted-foreground font-light mb-2">
                    {t.description}
                  </p>
                )}
                <p className="font-sans text-[11px] tracking-[0.1em] uppercase text-[#BF944A]">
                  {t.nombreSeances} session{t.nombreSeances !== 1 ? "s" : ""}
                  {t.dureeValiditeJours ? ` · valid ${t.dureeValiditeJours} days` : ""}
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
                  {selected.nombreSeances} session{selected.nombreSeances !== 1 ? "s" : ""}
                </span>
                <span className="font-serif text-2xl text-[#1A1A1A]">£{selected.prixPublic}</span>
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
              Choose a different package
            </button>
          </form>
        )}
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
