import { Link } from "wouter";
import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { BOOKING_URL, ADDRESS } from "../lib/booking";
import { trackBookClick } from "../lib/analytics";

export default function Studios() {
  useDocumentMeta(
    "Our Studios: Kensington & Chelsea | Elysian Paris",
    "Elysian Paris has two London studios: our permanent Kensington studio, open by appointment throughout the week, and a weekly Chelsea studio on the King's Road, every Friday."
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-32 md:py-40">
        <div className="text-center mb-16">
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Elysian Paris
          </p>
          <h1 className="font-serif text-4xl md:text-6xl text-[#1A1A1A] font-light leading-tight mb-6">
            Two Studios in London.
          </h1>
          <p className="font-sans text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-xl mx-auto">
            One private practice, two locations: a permanent studio in
            Kensington and a weekly studio in Chelsea.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
          <div className="border border-border p-10 text-center flex flex-col">
            <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-3">
              Permanent Studio
            </p>
            <h2 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] font-light mb-4">
              Kensington
            </h2>
            <p className="font-sans text-sm text-muted-foreground font-light mb-6">
              {ADDRESS}
            </p>
            <p className="font-sans text-base text-muted-foreground font-light leading-relaxed mb-2 flex-1">
              Private appointments throughout the week for signature
              lymphatic drainage, body sculpting and personalised wellness
              treatments.
            </p>
            <p className="font-sans text-xs text-muted-foreground/70 font-light mb-8">
              Open 24/7 · By appointment only
            </p>
            <a
              href={BOOKING_URL}
              data-testid="button-book-kensington-studios"
              onClick={() => trackBookClick("studios_kensington")}
              className="font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 inline-block"
            >
              Book Kensington
            </a>
            <Link
              href="/kensington"
              className="mt-5 font-sans text-xs text-muted-foreground/70 hover:text-primary font-light underline underline-offset-4 transition-colors duration-300"
            >
              More about Kensington
            </Link>
          </div>

          <div className="border border-border p-10 text-center flex flex-col">
            <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-3">
              Weekly · Every Friday
            </p>
            <h2 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] font-light mb-4">
              Chelsea
            </h2>
            <p className="font-sans text-sm text-muted-foreground font-light mb-6">
              319 King's Road, Chelsea · London SW3 5EP
            </p>
            <p className="font-sans text-base text-muted-foreground font-light leading-relaxed mb-2 flex-1">
              Elysian Paris in Chelsea one day per week, with a limited
              number of appointments available.
            </p>
            <p className="font-sans text-xs text-muted-foreground/70 font-light mb-8">
              60-minute sessions: Lymphatic Drainage, Post-Op, Pre/Postnatal
            </p>
            <Link
              href="/book-chelsea"
              data-testid="button-book-chelsea-studios"
              onClick={() => trackBookClick("studios_chelsea")}
              className="font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 inline-block"
            >
              Book Chelsea, Every Friday
            </Link>
            <Link
              href="/chelsea"
              className="mt-5 font-sans text-xs text-muted-foreground/70 hover:text-primary font-light underline underline-offset-4 transition-colors duration-300"
            >
              More about Chelsea
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
