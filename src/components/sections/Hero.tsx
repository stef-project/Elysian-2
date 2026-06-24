import { motion } from "framer-motion";
import heroImage from "../../assets/hero-wellness.webp";
import { BOOKING_URL } from "../../lib/booking";

const credentials = [
  "French Therapist Expert",
  "London · Paris · Dubai",
  "Immediate decongestion",
  "Post-op recovery",
];

export function Hero() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-card">
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Lymphatic drainage and body contouring clinic — Elysian Paris, Kensington, London"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#1A1A1A]/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/20 via-transparent to-[#1A1A1A]/70" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 mt-24">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="font-sans text-[11px] tracking-[0.3em] uppercase text-[#BF944A] mb-8"
        >
          Kensington, London · Established 2023
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-4xl md:text-6xl lg:text-[80px] text-[#F7F5F2] font-light leading-[1.05] tracking-tight mb-6"
        >
          The Home of The<br />
          <span className="italic text-[#E2CAA2]">Elysian Paris Method®</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.8 }}
          className="font-sans text-base md:text-xl text-[#F7F5F2]/85 font-light max-w-2xl mx-auto leading-relaxed mb-5"
        >
          Visible decongestion, lighter legs and a sculpted silhouette from the
          very first session for many clients.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1 }}
          className="font-sans text-sm text-[#F7F5F2]/60 font-light max-w-xl mx-auto leading-relaxed mb-10"
        >
          Developed by Manuela Shala, French-trained therapist specialising in
          lymphatic drainage, body contouring and post-operative recovery.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-reserve-hero"
            className="font-sans text-xs tracking-[0.2em] uppercase bg-[#BF944A] text-[#1A1A1A] px-10 py-4 hover:bg-[#E2CAA2] transition-colors duration-300"
          >
            Book Your Consultation
          </a>
          <a
            href="#treatments"
            className="font-sans text-xs tracking-[0.2em] uppercase text-[#F7F5F2]/70 hover:text-[#F7F5F2] border-b border-[#F7F5F2]/30 hover:border-[#F7F5F2] pb-0.5 transition-colors duration-300"
          >
            Explore treatments →
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3"
        >
          {credentials.map((c) => (
            <span
              key={c}
              className="font-sans text-[10px] md:text-[11px] tracking-[0.18em] uppercase text-[#F7F5F2]/80 border border-[#F7F5F2]/25 rounded-full px-4 py-2"
            >
              {c}
            </span>
          ))}
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
