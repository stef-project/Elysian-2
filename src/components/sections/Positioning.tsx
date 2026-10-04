import { motion } from "framer-motion";

// Section volontairement courte et seule sur l'écran — une déclaration de
// marque, pas un paragraphe de plus. Rien d'autre ne doit venir lui faire
// concurrence visuellement.
export function Positioning() {
  return (
    <section className="py-24 md:py-36 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9 }}
        className="max-w-3xl mx-auto px-6 text-center"
      >
        <p className="font-serif text-2xl md:text-4xl text-[#1A1A1A] font-light leading-[1.4]">
          Not a drainage session repeated on everyone who walks in.
          <br />
          <span className="italic text-primary">A method, assessed, drained, sculpted and restored around your body.</span>
        </p>
      </motion.div>
    </section>
  );
}
