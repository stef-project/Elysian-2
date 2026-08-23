/**
 * ============================================================================
 *  BookAbroad.tsx — Réservation "sur demande" pour les clientes basées à
 *  l'étranger. Route : /book-abroad
 * ============================================================================
 *
 *  Volontairement sans calendrier ni compte : l'administratrice voyage dans
 *  plusieurs pays, avec des tarifs et des disponibilités qui varient selon
 *  où elle se trouve. Pas de créneau à choisir ici — la cliente envoie ses
 *  coordonnées et ses disponibilités, l'administratrice organise le
 *  rendez-vous elle-même une fois sur place (comme convenu : gestion 100%
 *  manuelle pour l'international, voir aussi les liens de paiement Stripe
 *  créés au cas par cas).
 */

import { useState, useEffect } from "react";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { whatsappWith } from "../lib/booking";
import { TREATMENT_LABELS } from "../lib/contraindications";
import { trackWhatsappClick } from "../lib/analytics";
import { submitAbroadRequest } from "../lib/packageBooking";
import { useDocumentMeta } from "../lib/useDocumentMeta";

const TREATMENT_OPTIONS = Object.entries(TREATMENT_LABELS).filter(
  ([key]) => key !== "prenatal" && key !== "postnatal" // "prenatal-postnatal" seul suffit dans cette liste
);

export default function BookAbroad() {
  useDocumentMeta(
    "Book From Abroad | Elysian Paris",
    "Living outside the UK? Request your Elysian Paris treatment and we'll arrange it around our travel schedule."
  );

  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [treatment, setTreatment] = useState(TREATMENT_OPTIONS[0]?.[0] ?? "");
  const [dates, setDates] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const treatmentLabel = TREATMENT_LABELS[treatment] ?? treatment;
    const lines = [
      `Hello! I'm based abroad and would like to request a booking with Elysian Paris.`,
      ``,
      `Name: ${prenom}`,
      `Email: ${email}`,
      `Country: ${country}`,
      `Treatment: ${treatmentLabel}`,
      `When I'm next available: ${dates}`,
    ];
    if (message.trim()) lines.push(``, message.trim());

    trackWhatsappClick("book_abroad_form");
    // window.open doit rester synchrone dans ce geste de clic (sinon le
    // popup est bloqué par le navigateur) — la trace Sheet + email admin
    // part donc en tâche de fond, jamais attendue, et son échec éventuel ne
    // doit jamais empêcher l'envoi du message WhatsApp lui-même.
    window.open(whatsappWith(lines.join("\n")), "_blank", "noopener,noreferrer");
    submitAbroadRequest({
      prenom,
      email,
      country,
      treatment,
      dates,
      message,
    }).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-28 md:py-36">
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
          International Clients
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-6">
          Book from abroad
        </h1>
        <p className="font-sans text-sm text-muted-foreground font-light mb-10 leading-relaxed">
          We treat clients internationally as our schedule allows. There's no calendar to
          book here. Tell us a little about you and when you're next available, and we'll
          get back to you on WhatsApp to arrange your session and, where relevant, local
          pricing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label htmlFor="country" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
              Country
            </label>
            <input
              id="country"
              type="text"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] focus:outline-none focus:border-[#BF944A] transition-colors"
            />
          </div>

          <div>
            <label htmlFor="treatment" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
              Treatment of interest
            </label>
            <select
              id="treatment"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] focus:outline-none focus:border-[#BF944A] transition-colors"
            >
              {TREATMENT_OPTIONS.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dates" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
              When are you next available?
            </label>
            <input
              id="dates"
              type="text"
              required
              value={dates}
              onChange={(e) => setDates(e.target.value)}
              placeholder="e.g. mid-October, or flexible"
              className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#BF944A] transition-colors"
            />
          </div>

          <div>
            <label htmlFor="message" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
              Anything else{" "}
              <span className="font-sans text-[10px] normal-case tracking-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] focus:outline-none focus:border-[#BF944A] transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
          >
            Send request on WhatsApp
          </button>
        </form>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
