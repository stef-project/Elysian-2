import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Hero } from "../components/sections/Hero";
import { Philosophy } from "../components/sections/Philosophy";
import { Method } from "../components/sections/Method";
import { Results } from "../components/sections/Results";
import { LymphaticDrainage } from "../components/sections/LymphaticDrainage";
import { Services } from "../components/sections/Services";
import { FAQ } from "../components/sections/FAQ";
import { CorporateModal } from "../components/ui/CorporateModal";
import { Quotes } from "../components/sections/Quotes";
import { Facility } from "../components/sections/Facility";
import { Enquiry } from "../components/sections/Enquiry";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { CookieConsent } from "../components/ui/CookieConsent";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-3 focus:left-3 focus:bg-[#1A1A1A] focus:text-[#F7F5F2] focus:px-5 focus:py-2.5 focus:text-xs focus:tracking-[0.15em] focus:uppercase"
      >
        Skip to content
      </a>
      <TopBar />
      <Navbar />

      <main id="main-content">
        <Hero />
        <Philosophy />
        <Method />
        <Results />
        <LymphaticDrainage />
        <Services />
        <div className="max-w-6xl mx-auto px-6">
          <CorporateModal />
        </div>
        <Quotes />
        <Facility />
        <FAQ />
        <Enquiry />
      </main>

      <Footer />
      <WhatsAppButton />
      <CookieConsent />
    </div>
  );
}
