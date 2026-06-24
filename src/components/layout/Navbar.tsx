import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import logo from "../../assets/logo-dark.png";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      className={`fixed top-[37px] left-0 right-0 z-40 transition-all duration-500 ${
        isScrolled
          ? "backdrop-blur-md border-b border-[#E8E6E1] bg-[rgba(254,253,251,0.96)] shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex-1 flex items-center">
          <nav className="hidden md:flex items-center gap-10">
            <a
              href="#about"
              className="text-[11px] font-sans font-light tracking-[0.18em] uppercase text-foreground/60 hover:text-foreground transition-colors duration-300"
            >
              About
            </a>
            <a
              href="#treatments"
              className="text-[11px] font-sans font-light tracking-[0.18em] uppercase text-foreground/60 hover:text-foreground transition-colors duration-300"
            >
              Treatments
            </a>
            <a
              href="#location"
              className="text-[11px] font-sans font-light tracking-[0.18em] uppercase text-foreground/60 hover:text-foreground transition-colors duration-300"
            >
              Visit
            </a>
          </nav>
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
            href="https://calendar.app.google/Vdgk5XD1apxPp36U6"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-book-now"
            className="text-[11px] font-sans font-light tracking-[0.18em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-6 py-2.5 hover:bg-[#BF944A] transition-colors duration-300"
          >
            Book Now
          </a>
        </div>
      </div>
    </motion.header>
  );
}
