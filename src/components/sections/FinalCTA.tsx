import { motion } from "framer-motion";
import { trackBookClick } from "../../lib/analytics";
import { BOOKING_URL } from "../../lib/booking";

// Fermeture du parcours — un seul CTA, le même que celui du Hero, pour que
// la cliente retrouve exactement l'action qu'elle a déjà vue en haut de page.
export function FinalCTA() {
  return (
    <section className="py-24 md:py-36 bg-[#1A1A1A] text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-xl mx-auto px-6"
      >
        <h2 className="font-serif text-3xl md:text-4xl text-[#F7F5F2] font-light mb-6">
          Ready to begin?
        </h2>
        <p className="font-sans text-[#F7F5F2]/60 font-light leading-[1.9] mb-10">
          Private, by appointment only, in Kensington and Chelsea.
        </p>
        <a
          href={BOOKING_URL}
          onClick={() => trackBookClick("final_cta")}
          className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#BF944A] text-[#1A1A1A] px-12 py-4 hover:bg-[#E2CAA2] transition-colors duration-300"
        >
          Begin Your Elysian Experience
        </a>
      </motion.div>
    </section>
  );
}
