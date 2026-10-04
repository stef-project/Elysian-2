import { motion } from "framer-motion";

// Les 4 étapes de la Elysian Paris Method™ — un process visible, pas un
// paragraphe d'adjectifs. Chaque ligne reprend le contenu réel déjà existant
// (anciens "pillars"), juste réorganisée en séquence plutôt qu'en liste plate.
const steps = [
  {
    n: "01",
    title: "Assess",
    body: "Heavy legs, bloating, fluid retention, swelling, or sculpting goals, mapped before we begin. No two sessions start from the same place.",
  },
  {
    n: "02",
    title: "Drain",
    body: "Hands-led manual lymphatic drainage, French-trained, to clear what's holding your body back before any sculpting begins.",
  },
  {
    n: "03",
    title: "Sculpt",
    body: "Targeted contouring technique layered onto the drainage work, the specific combination that makes the method distinctly our own.",
  },
  {
    n: "04",
    title: "Restore",
    body: "Personalised aftercare and lifestyle guidance, so what you feel leaving the table still holds weeks later.",
  },
];

export function Method() {
  return (
    <section id="method" className="py-20 md:py-32 bg-[#1A1A1A] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-[#BF944A] mb-6">
            Trained in France · Kensington, London
          </p>
          <h2 className="font-serif text-4xl md:text-6xl text-[#F7F5F2] font-light leading-[1.05] mb-8">
            The Elysian Paris<br />
            <span className="italic text-[#E2CAA2]">Method™.</span>
          </h2>
          <div className="w-12 h-[1px] bg-[#BF944A] mb-8" />
          <p className="font-sans text-lg text-[#F7F5F2]/80 font-light leading-[1.9] mb-5">
            Every body is different. Every Elysian treatment is personalised.
            Not a drainage session repeated on everyone who walks in, a
            method: assessed, drained, sculpted and restored around the body
            in front of us.
          </p>
          <p className="font-sans text-[#F7F5F2]/55 font-light leading-[1.9]">
            Our founder trained in the renowned <span className="italic text-[#F7F5F2]/80">Manuela
            Shala</span> technique, then adapted it with her own expertise into the
            Elysian Paris Method™, a method entirely her own.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12 mt-20">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-4 left-full w-10 h-[1px] bg-[#F7F5F2]/15" />
              )}
              <p className="font-serif text-2xl text-[#BF944A] italic mb-4">{s.n}</p>
              <h3 className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#F7F5F2] mb-3">{s.title}</h3>
              <p className="font-sans text-[#F7F5F2]/50 font-light leading-[1.8] text-sm">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20 text-center"
        >
          <a
            href="#treatments"
            className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#BF944A] text-[#1A1A1A] px-10 py-4 hover:bg-[#E2CAA2] transition-colors duration-300"
          >
            Experience the Method
          </a>
        </motion.div>
      </div>
    </section>
  );
}
