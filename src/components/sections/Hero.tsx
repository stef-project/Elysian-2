import { motion } from "framer-motion";
import heroImage from "../../assets/hero-wellness.webp";
import { trackBookClick } from "../../lib/analytics";
import { BOOKING_URL } from "../../lib/booking";

export function Hero() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-card">
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Lymphatic drainage and body contouring clinic, Elysian Paris, Kensington, London"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#1A1A1A]/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/20 via-transparent to-[#1A1A1A]/70" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 mt-24">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-4xl md:text-6xl lg:text-[80px] text-[#F7F5F2] font-light leading-[1.05] tracking-tight mb-4"
        >
          Elysian Paris
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="font-sans text-[11px] md:text-xs tracking-[0.3em] uppercase text-[#E2CAA2] mb-8"
        >
          French Lymphatic Sculpting &amp; Body Wellness
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.9 }}
          className="font-sans text-base md:text-xl text-[#F7F5F2]/85 font-light max-w-2xl mx-auto leading-relaxed mb-5"
        >
          A private body wellness experience combining French lymphatic
          expertise, precise sculpting techniques and personalised care, so
          you feel lighter, restored and beautifully refined.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.1 }}
          className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#F7F5F2]/60 mb-10"
        >
          London, Kensington &amp; Chelsea
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Accès direct aux soins en un clic — les pages studios /kensington
              et /chelsea restent accessibles via le footer et la page Studios,
              mais le CTA principal ne doit jamais imposer un clic intermédiaire. */}
          <a
            href={BOOKING_URL}
            data-testid="button-book-kensington"
            onClick={() => trackBookClick("hero_kensington")}
            className="font-sans text-xs tracking-[0.2em] uppercase bg-[#BF944A] text-[#1A1A1A] px-10 py-4 hover:bg-[#E2CAA2] transition-colors duration-300"
          >
            Book Kensington
          </a>
          <a
            href="/book-chelsea"
            data-testid="button-book-chelsea"
            onClick={() => trackBookClick("hero_chelsea")}
            className="font-sans text-xs tracking-[0.2em] uppercase text-[#F7F5F2] border border-[#F7F5F2]/40 px-10 py-4 hover:border-[#F7F5F2] hover:bg-[#F7F5F2]/10 transition-colors duration-300"
          >
            Book Chelsea, Every Friday
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
