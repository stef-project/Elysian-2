import {
  COMPANY_LEGAL_NAME,
  COMPANY_NUMBER,
  COMPANY_JURISDICTION,
  COMPANY_REGISTERED_OFFICE,
} from "../../lib/booking";

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-[#F7F5F2]/10">
          <div>
            <p className="font-serif text-2xl tracking-[0.2em] uppercase text-[#F7F5F2] mb-4">
              Elysian Paris
            </p>
            <p className="font-sans text-xs text-[#F7F5F2]/40 font-light leading-relaxed mb-6">
              London's private sanctuary for refined wellbeing and bespoke body treatments.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/elysian.institute/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Elysian Paris on Instagram"
                className="text-[#F7F5F2]/50 hover:text-[#BF944A] transition-colors duration-300"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.44c-3.14 0-3.51.01-4.75.07-1.15.05-1.77.25-2.18.41-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.36 1.03-.41 2.18-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.15.25 1.77.41 2.18.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.36 2.18.41 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.15-.05 1.77-.25 2.18-.41.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.36-1.03.41-2.18.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.15-.25-1.77-.41-2.18a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.36-2.18-.41-1.24-.06-1.61-.07-4.75-.07zm0 2.45a5.95 5.95 0 1 1 0 11.9 5.95 5.95 0 0 1 0-11.9zm0 1.44a4.51 4.51 0 1 0 0 9.02 4.51 4.51 0 0 0 0-9.02zm6.18-.41a1.39 1.39 0 1 1-2.78 0 1.39 1.39 0 0 1 2.78 0z"/>
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@elysian.institute"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Elysian Paris on TikTok"
                className="text-[#F7F5F2]/50 hover:text-[#BF944A] transition-colors duration-300"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64a5.69 5.69 0 0 0 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.36 4.36 0 0 1-3.24-1.48z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#BF944A] mb-5">
              Treatments
            </p>
            <ul className="space-y-2.5">
              {[
                { label: "Lymphatic Drainage", href: "/#treatments" },
                { label: "Maderotherapy", href: "/#treatments" },
                { label: "Lymphatic Drainage After Surgery", href: "/lymphatic-drainage-after-surgery" },
                { label: "Prenatal & Postnatal", href: "/#treatments" },
                { label: "Cavitation Fusion", href: "/#treatments" },
              ].map((t) => (
                <li key={t.label}>
                  <a
                    href={t.href}
                    className="font-sans text-xs text-[#F7F5F2]/50 hover:text-[#F7F5F2] transition-colors duration-300 font-light"
                  >
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#BF944A] mb-5">
              Visit
            </p>
            <div className="space-y-3">
              <p className="font-sans text-xs text-[#F7F5F2]/50 font-light leading-relaxed">
                61 Kensington Church Street<br />
                London, W8 4BA
              </p>
              <p className="font-sans text-xs text-[#F7F5F2]/50 font-light">
                Mon to Sun · By appointment only
              </p>
              <a
                href="mailto:info@elysian-institute.com"
                className="block font-sans text-xs text-[#F7F5F2]/50 hover:text-[#BF944A] transition-colors duration-300 font-light"
              >
                info@elysian-institute.com
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-sans text-[11px] text-[#F7F5F2]/30 tracking-widest uppercase">
            &copy; {new Date().getFullYear()} Elysian Paris. All rights reserved.
          </p>
          <div className="flex gap-8">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Cookie Policy", href: "/cookie-policy" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-sans text-[11px] text-[#F7F5F2]/30 hover:text-[#F7F5F2]/60 tracking-widest uppercase transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <p className="mt-6 font-sans text-[10px] text-[#F7F5F2]/20 tracking-wide">
          Elysian Paris is a trading name of {COMPANY_LEGAL_NAME}, a company registered in{" "}
          {COMPANY_JURISDICTION}, company no. {COMPANY_NUMBER}. Registered office:{" "}
          {COMPANY_REGISTERED_OFFICE}.
        </p>
      </div>
    </footer>
  );
}
