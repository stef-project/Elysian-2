import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { WHATSAPP_URL } from "../lib/booking";
import {
  isPackageBookingConfigured,
  getOfferDetails,
  respondToOffer,
  PACKAGE_SERVICES,
} from "../lib/packageBooking";

type OfferDetails = {
  prenom: string;
  nomForfait: string;
  soinsInclus: string[];
  nombreSeances: number;
  prixFinal: number;
  dureeValiditeJours: number | null;
  moyenPaiementPropose: string;
  statut: string;
};

const RESPONDABLE_STATUSES = ["viewed"];

export default function PackageOffer() {
  const params = useParams<{ offerId: string }>();
  const offerId = params.offerId ?? "";
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState("");
  const [offer, setOffer] = useState<OfferDetails | null>(null);

  // Page de consultation d'offre : jamais indexée, même si l'URL fuite.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  // Appel backend obligatoire avant tout affichage : c'est lui qui valide le
  // jeton et l'expiration, et qui fait passer sent/draft -> viewed côté
  // serveur. Rien n'est affiché tant qu'il n'a pas répondu avec succès.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!offerId || !token) {
        setError("This link is invalid.");
        setLoading(false);
        return;
      }
      try {
        const res = await getOfferDetails(offerId, token);
        if (!cancelled) setOffer(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "This link is invalid or has expired.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId, token]);

  const serviceLabel = (id: string) => PACKAGE_SERVICES.find((s) => s.id === id)?.label ?? id;

  const handleRespond = async (response: "accept" | "decline") => {
    setResponding(true);
    setError("");
    try {
      const res = await respondToOffer(offerId, token, response);
      setOffer((prev) => (prev ? { ...prev, statut: res.statut } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResponding(false);
    }
  };

  if (!isPackageBookingConfigured()) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <TopBar />
        <Navbar />
        <main className="max-w-xl mx-auto px-6 py-32 text-center">
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Personal Offer
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-6">
            This service is not yet available online.
          </h1>
          <p className="font-sans text-muted-foreground font-light mb-10">
            Please contact us directly and we will finalise your package with you.
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Personal Offer
          </p>

          {loading && (
            <p className="font-sans text-sm text-muted-foreground font-light">Loading your offer…</p>
          )}

          {!loading && error && (
            <>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-6">
                This link is no longer valid.
              </h1>
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
              >
                Message us on WhatsApp
              </a>
            </>
          )}

          {!loading && !error && offer && (
            <>
              <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-2">
                {offer.prenom ? `${offer.prenom}, here` : "Here"} is your personal offer
              </h1>
              <p className="font-sans text-2xl text-[#1A1A1A] font-light mb-10">{offer.nomForfait}</p>

              <div className="space-y-3 mb-10 font-sans text-sm">
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Sessions</span>
                  <span>{offer.nombreSeances}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Treatments included</span>
                  <span className="text-right">{offer.soinsInclus.map(serviceLabel).join(", ")}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Price</span>
                  <span>£{offer.prixFinal}</span>
                </div>
                {offer.dureeValiditeJours && (
                  <div className="flex justify-between border-b border-border pb-3">
                    <span className="text-muted-foreground">Valid for</span>
                    <span>{offer.dureeValiditeJours} days from purchase</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
              )}

              {RESPONDABLE_STATUSES.includes(offer.statut) && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    disabled={responding}
                    onClick={() => handleRespond("accept")}
                    className="flex-1 font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50"
                  >
                    {responding ? "Please wait…" : "Accept this offer"}
                  </button>
                  <button
                    disabled={responding}
                    onClick={() => handleRespond("decline")}
                    className="flex-1 font-sans text-xs tracking-[0.2em] uppercase border border-border px-10 py-4 hover:border-primary transition-colors duration-300 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}

              {offer.statut === "accepted" && (
                <div className="text-center py-6">
                  <div className="w-8 h-[1px] bg-primary mx-auto mb-6" />
                  <p className="font-serif text-2xl text-[#1A1A1A] mb-3">Thank you — offer accepted.</p>
                  <p className="font-sans text-muted-foreground font-light text-sm mb-8">
                    We will be in touch within 24 hours to arrange payment and activate your package.
                  </p>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-sans text-xs tracking-[0.2em] uppercase border border-[#1A1A1A] text-[#1A1A1A] px-10 py-4 hover:bg-[#1A1A1A] hover:text-[#F7F5F2] transition-colors duration-300"
                  >
                    Message us on WhatsApp
                  </a>
                </div>
              )}

              {offer.statut === "paid" && (
                <div className="text-center py-6">
                  <div className="w-8 h-[1px] bg-primary mx-auto mb-6" />
                  <p className="font-serif text-2xl text-[#1A1A1A] mb-3">Your package is active.</p>
                  <p className="font-sans text-muted-foreground font-light text-sm mb-8">
                    You can now book your sessions online.
                  </p>
                  <a
                    href="/use-package"
                    className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
                  >
                    Book a session →
                  </a>
                </div>
              )}

              {offer.statut === "declined" && (
                <p className="font-sans text-sm text-muted-foreground font-light text-center py-6">
                  You have declined this offer. Feel free to reach out if you change your mind.
                </p>
              )}
            </>
          )}
        </motion.div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
