export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-[#F7F5F2]/10">
          <div>
            <p className="font-serif text-2xl tracking-[0.2em] uppercase text-[#F7F5F2] mb-4">
              Elysian
            </p>
            <p className="font-sans text-xs text-[#F7F5F2]/40 font-light leading-relaxed">
              London's private sanctuary for refined wellbeing and bespoke body treatments.
            </p>
          </div>

          <div>
            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#BF944A] mb-5">
              Treatments
            </p>
            <ul className="space-y-2.5">
              {[
                "Lymphatic Drainage",
                "Maderotherapy",
                "Post-Operative Care",
                "Prenatal & Postnatal",
                "Cavitation Fusion",
              ].map((t) => (
                <li key={t}>
                  <a
                    href="#treatments"
                    className="font-sans text-xs text-[#F7F5F2]/50 hover:text-[#F7F5F2] transition-colors duration-300 font-light"
                  >
                    {t}
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
                Mon–Sun · By appointment only
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
            &copy; {new Date().getFullYear()} Elysian Institute. All rights reserved.
          </p>
          <div className="flex gap-8">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((link) => (
              <a
                key={link}
                href="#"
                className="font-sans text-[11px] text-[#F7F5F2]/30 hover:text-[#F7F5F2]/60 tracking-widest uppercase transition-colors duration-300"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
