import { motion } from "framer-motion";

// Dérivé des piliers déjà réels (Philosophy.tsx) + des infos confirmées par
// la fondatrice — reformulé en 6 affirmations courtes. "Bespoke" n'est
// volontairement pas repris ici, déjà utilisé ailleurs sur le site.
const pillars = [
  { label: "Private", body: "One-to-one, by appointment only. Kensington and Chelsea." },
  { label: "French-Trained", body: "Trained in France, practising in Kensington." },
  { label: "Tailored", body: "Every session starts with an assessment, not a script." },
  { label: "Signature Method", body: "The Elysian Paris Method™, trained in France, refined into something distinctly our own." },
  { label: "Results-Led", body: "Real clients, real sessions. No invented numbers, no overpromising." },
  { label: "Personal Care", body: "No shortcuts, no delegation, from first consultation to last." },
];

export function WhyElysian() {
  return (
    <section className="py-20 md:py-32 bg-[#F0EBE1]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Why Elysian
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light">
            Six reasons clients<br />
            <span className="italic text-primary">come back.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#D4C9BD]">
          {pillars.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="bg-[#F0EBE1] p-8"
            >
              <h3 className="font-serif text-xl text-[#1A1A1A] mb-3">{p.label}</h3>
              <p className="font-sans text-sm text-[#1A1A1A]/70 font-light leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
