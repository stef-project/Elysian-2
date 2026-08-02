import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { CHELSEA_BOOKING_URL } from "../lib/booking";

export default function Chelsea() {
  useDocumentMeta(
    "Lymphatic Drainage Chelsea | Elysian Paris",
    "Elysian Paris in Chelsea — exclusive weekly appointments on the King's Road. Expert lymphatic drainage and body sculpting, every Friday."
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar location="Chelsea, London" />
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-32 md:py-40 text-center">
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
          Flagship Studio on the King's Road
        </p>
        <h1 className="font-serif text-4xl md:text-6xl text-[#1A1A1A] font-light leading-tight mb-6">
          Elysian Paris Chelsea
        </h1>
        <p className="font-sans text-sm text-muted-foreground font-light mb-10">
          319 King's Road, Chelsea · London SW3 5EP
        </p>
        <p className="font-sans text-base md:text-lg text-muted-foreground font-light leading-relaxed max-w-xl mx-auto mb-6">
          Experience Elysian Paris in Chelsea one day per week, with a limited
          number of appointments available.
        </p>
        <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#BF944A] mb-2">
          Every Friday — Limited Availability
        </p>
        <p className="font-sans text-xs text-muted-foreground/70 font-light mb-12">
          60-minute sessions — Post-Op or Pre &amp; Postnatal Care
        </p>

        <div>
          <a
            href={CHELSEA_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-book-chelsea-page"
            className="font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300 inline-block"
          >
            Book Chelsea — Every Friday
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
