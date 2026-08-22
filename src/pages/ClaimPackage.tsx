/**
 * ============================================================================
 *  ClaimPackage.tsx — Demande de forfait pour une cliente sans email connu.
 *  Route : /claim-package
 * ============================================================================
 *
 *  Pour une cliente dont le forfait a été acheté avant ce système (email
 *  jamais collecté) : /use-package ne peut lui envoyer aucun code. Cette
 *  page recueille son email (+ prénom/nom/téléphone/message), l'administratrice
 *  valide ensuite la demande depuis le portail admin, ce qui crée la cliente
 *  et son forfait — après quoi /use-package fonctionne normalement.
 */

import { useState, useEffect } from "react";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { WHATSAPP_URL } from "../lib/booking";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { isPackageBookingConfigured, submitPackageClaim } from "../lib/packageBooking";

export default function ClaimPackage() {
  useDocumentMeta(
    "Claim Your Package | Elysian Paris",
    "Let us know you have a package with Elysian Paris so we can activate your account."
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
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get("email") ?? "");
  const [telephone, setTelephone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await submitPackageClaim(email.trim(), prenom.trim(), nom.trim(), telephone.trim(), message.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isPackageBookingConfigured()) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <TopBar />
        <Navbar />
        <main className="max-w-xl mx-auto px-6 py-32 text-center">
          <p className="font-sans text-muted-foreground font-light mb-10">
            This service is not yet available online. Please contact us directly.
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
          Existing Package
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-6">
          Let us know about your package
        </h1>

        {!submitted && (
          <p className="font-sans text-sm text-muted-foreground font-light mb-10">
            If you purchased a package with us before and didn't receive a verification code,
            it's because we don't yet have your email on file. Tell us a little about your
            package below and we'll activate your account within 24 hours.
          </p>
        )}

        {submitted ? (
          <div className="py-6">
            <div className="w-8 h-[1px] bg-primary mb-8" />
            <p className="font-serif text-2xl text-[#1A1A1A] font-light mb-4">
              Thank you.
            </p>
            <p className="font-sans text-sm text-muted-foreground font-light">
              We've received your request and will activate your package within 24 hours.
              You'll then be able to book using your email at{" "}
              <a href="/use-package" className="text-primary underline underline-offset-2">
                Book with your package
              </a>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

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
              <label htmlFor="telephone" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
                Phone{" "}
                <span className="font-sans text-[10px] normal-case tracking-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] focus:outline-none focus:border-[#BF944A] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="message" className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] block mb-2">
                About your package{" "}
                <span className="font-sans text-[10px] normal-case tracking-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. 5-session lymphatic drainage package, purchased in July at Kensington"
                className="w-full border border-[#D4C9BD] bg-[#FAFAF9] px-4 py-3 font-sans text-sm text-[#1A1A1A] placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#BF944A] transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending…" : "Send request"}
            </button>
          </form>
        )}
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
