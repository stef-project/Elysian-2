import { motion } from "framer-motion";
import heroImage from "../../assets/hero-wellness.webp";

export function Hero() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-card">
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Lymphatic drainage and body contouring clinic — Elysian Paris, Kensington, London"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#1A1A1A]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/20 via-transparent to-[#1A1A1A]/60" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 mt-20">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="font-sans text-[11px] tracking-[0.3em] uppercase text-[#BF944A] mb-8"
        >
          Kensington, London · Established 2024
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-5xl md:text-7xl lg:text-[90px] text-[#F7F5F2] font-light leading-[1.05] tracking-tight mb-6"
        >
          Tailored care,<br />
          <span className="italic text-[#E2CAA2]">timeless refinement.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.9 }}
          className="font-sans text-base md:text-lg text-[#F7F5F2]/70 font-light max-w-xl mx-auto leading-relaxed mb-12"
        >
          Your private Kensington sanctuary for manual lymphatic drainage and
          bespoke body contouring in Central London. Restoring balance,
          enhancing confidence, elevating wellbeing.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#treatments"
            data-testid="button-reserve-hero"
            className="font-sans text-xs tracking-[0.2em] uppercase bg-[#BF944A] text-[#1A1A1A] px-10 py-4 hover:bg-[#E2CAA2] transition-colors duration-300"
          >
            Reserve a Treatment
          </a>
          <a
            href="#about"
            className="font-sans text-xs tracking-[0.2em] uppercase text-[#F7F5F2]/70 hover:text-[#F7F5F2] border-b border-[#F7F5F2]/30 hover:border-[#F7F5F2] pb-0.5 transition-colors duration-300"
          >
            Explore treatments →
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <div className="w-[1px] h-12 bg-[#F7F5F2]/30 animate-pulse" />
      </motion.div>
    </section>
  );
}
