import { TopBar } from "../components/layout/TopBar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Hero } from "../components/sections/Hero";
import { Philosophy } from "../components/sections/Philosophy";
import { Method } from "../components/sections/Method";
import { Methodology } from "../components/sections/Methodology";
import { LymphaticDrainage } from "../components/sections/LymphaticDrainage";
import { Services } from "../components/sections/Services";
import { FAQ } from "../components/sections/FAQ";
import { CorporateModal } from "../components/ui/CorporateModal";
import { Results } from "../components/sections/Results";
import { Quotes } from "../components/sections/Quotes";
import { Facility } from "../components/sections/Facility";
import { Enquiry } from "../components/sections/Enquiry";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { CookieConsent } from "../components/ui/CookieConsent";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />
      <Navbar />

      <main>
        <Hero />
        <Philosophy />
        <Method />
        <Methodology />
        <LymphaticDrainage />
        <Services />
        <div className="max-w-6xl mx-auto px-6">
          <CorporateModal />
        </div>
        <Results />
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
