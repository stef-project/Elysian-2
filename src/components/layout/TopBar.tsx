import { BOOKING_URL, WHATSAPP_URL } from "../../lib/booking";

export function TopBar() {
  return (
    <div className="w-full bg-[#1A1A1A] py-2.5 px-4 z-50 relative">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] font-sans font-light text-[#BF944A] hidden sm:block">
          Kensington, London &nbsp;&middot;&nbsp; By appointment only
        </p>
        <div className="flex items-center gap-5 ml-auto">
          <a
            href={BOOKING_URL}
            data-testid="link-topbar-book"
            className="text-[11px] uppercase tracking-[0.18em] font-sans font-light text-[#F7F5F2]/70 hover:text-[#BF944A] transition-colors duration-300"
          >
            Book
          </a>
          <span className="text-[#F7F5F2]/20">|</span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-topbar-concierge"
            className="text-[11px] uppercase tracking-[0.18em] font-sans font-light text-[#F7F5F2]/70 hover:text-[#BF944A] transition-colors duration-300"
          >
            Concierge
          </a>
        </div>
      </div>
    </div>
  );
}
