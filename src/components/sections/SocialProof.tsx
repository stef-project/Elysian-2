import { motion } from "framer-motion";

const proofPoints = [
  { value: "3+ years", label: "Of loyal returning clients" },
  { value: "Hundreds", label: "Of treatments performed" },
  { value: "London · Paris · Dubai", label: "Trusted by clients across" },
];

export function SocialProof() {
  return (
    <section className="bg-background border-b border-border py-20">
      <div className="max-w-5xl mx-auto px-6">
        <motion.blockquote
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="w-8 h-[1px] bg-primary mx-auto mb-8" />
          <p className="font-serif text-2xl md:text-3xl text-[#1A1A1A] font-light leading-snug mb-6">
            "I had tried several treatments before, but with Elysian Paris the
            results were immediate. I felt lighter as soon as the session was
            over."
          </p>
          <footer className="font-sans text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Kim · London
          </footer>
        </motion.blockquote>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 pt-12 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-10 text-center"
        >
          {proofPoints.map((p) => (
            <div key={p.value}>
              <p className="font-serif text-2xl md:text-3xl text-[#BF944A] mb-2">
                {p.value}
              </p>
              <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {p.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
