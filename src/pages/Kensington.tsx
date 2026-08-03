import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { BOOKING_URL, ADDRESS } from "../lib/booking";

export default function Kensington() {
  useDocumentMeta(
    "Lymphatic Drainage Kensington | Elysian Paris",
    "Private lymphatic drainage, body sculpting and wellness treatments in Kensington, London. Book your appointment at Elysian Paris."
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar location="Kensington, London" />
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-32 md:py-40 text-center">
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
          Our Permanent London Studio
        </p>
        <h1 className="font-serif text-4xl md:text-6xl text-[#1A1A1A] font-light leading-tight mb-6">
          Elysian Paris Kensington
        </h1>
        <p className="font-sans text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-xl mx-auto mb-10">
          Private appointments throughout the week for signature lymphatic
          drainage, body sculpting and personalised wellness treatments.
        </p>

        <div className="mb-12">
          <p className="font-sans text-sm text-muted-foreground font-light">
            {ADDRESS}
          </p>
          <p className="font-sans text-xs text-muted-foreground/70 font-light mt-1">
            Open 24/7 · By appointment only
          </p>
        </div>

        <div>
          <a
            href={BOOKING_URL}
            data-testid="button-book-kensington-page"
            className="font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 inline-block"
          >
            Book Kensington
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
