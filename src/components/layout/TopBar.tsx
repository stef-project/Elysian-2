import { BOOKING_URL, WHATSAPP_URL } from "../../lib/booking";
import { trackBookClick, trackWhatsappClick } from "../../lib/analytics";

interface TopBarProps {
  location?: string;
}

// Même flag que App.tsx/Footer.tsx (VITE_PACKAGE_BOOKING_ENABLED) : ce lien
// ne doit jamais être visible tant que la route /use-package est elle-même
// désactivée. Remplace "Concierge" (WhatsApp) dans cette position — le
// widget WhatsApp flottant reste présent sur toutes les pages, ce lien texte
// n'était donc pas le seul accès au contact.
const PACKAGE_BOOKING_ENABLED = import.meta.env.VITE_PACKAGE_BOOKING_ENABLED === "true";

export function TopBar({ location = "Kensington, London" }: TopBarProps) {
  return (
    <div className="w-full bg-[#1A1A1A] py-2.5 px-4 z-50 relative">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] font-sans font-light text-[#BF944A] hidden sm:block">
          {location} &nbsp;&middot;&nbsp; By appointment only
        </p>
        <div className="flex items-center gap-5 ml-auto">
          <a
            href={BOOKING_URL}
            data-testid="link-topbar-book"
            onClick={() => trackBookClick("topbar")}
            className="text-[11px] uppercase tracking-[0.18em] font-sans font-light text-[#F7F5F2]/70 hover:text-[#BF944A] transition-colors duration-300"
          >
            Book
          </a>
          <span className="text-[#F7F5F2]/20">|</span>
          {PACKAGE_BOOKING_ENABLED ? (
            <a
              href="/use-package"
              data-testid="link-topbar-my-package"
              className="text-[11px] uppercase tracking-[0.18em] font-sans font-light text-[#F7F5F2]/70 hover:text-[#BF944A] transition-colors duration-300"
            >
              My Package
            </a>
          ) : (
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-topbar-concierge"
              onClick={() => trackWhatsappClick("topbar")}
              className="text-[11px] uppercase tracking-[0.18em] font-sans font-light text-[#F7F5F2]/70 hover:text-[#BF944A] transition-colors duration-300"
            >
              Concierge
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
