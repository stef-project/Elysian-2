import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import logo from "../../assets/logo-dark.png";
import { BOOKING_URL } from "../../lib/booking";

const NAV_LINKS = [
  { label: "About", href: "/#about" },
  { label: "Treatments", href: "/#treatments" },
  { label: "Visit", href: "/#location" },
  { label: "Studios", href: "/kensington" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Referme le menu mobile si l'écran repasse en desktop, pour éviter un
  // panneau ouvert orphelin si l'utilisateur redimensionne la fenêtre.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <motion.header
      className={`fixed top-[37px] left-0 right-0 z-40 transition-all duration-500 ${
        isScrolled || isMobileMenuOpen
          ? "backdrop-blur-md border-b border-[#E8E6E1] bg-[rgba(254,253,251,0.96)] shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex-1 flex items-center">
          <nav className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[11px] font-sans font-light tracking-[0.18em] uppercase text-foreground/60 hover:text-foreground transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            data-testid="button-mobile-menu-toggle"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="md:hidden text-foreground/70 hover:text-foreground transition-colors duration-300"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <a href="/" className="flex-1 flex justify-center cursor-pointer select-none">
          <img
            src={logo}
            alt="Elysian Paris"
            className="h-7 md:h-8 w-auto"
          />
        </a>

        <div className="flex-1 flex justify-end items-center">
          <a
            href={BOOKING_URL}
            data-testid="link-book-now"
            className="text-[11px] font-sans font-light tracking-[0.18em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-6 py-2.5 hover:bg-[#BF944A] transition-colors duration-300"
          >
            Book Now
          </a>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-[#E8E6E1] bg-[rgba(254,253,251,0.98)]"
          >
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-5">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-sans font-light tracking-[0.18em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
