import { motion } from "framer-motion";
import texturesImage from "../../assets/treatment-hands.webp";

const steps = [
  {
    n: "01",
    title: "Assess & Map",
    body: "Every session opens with a precise reading of the treatment zone — fluid retention, tension, and goals are mapped before a single technique is applied.",
  },
  {
    n: "02",
    title: "Manual Drainage",
    body: "Hands-led lymphatic technique, calibrated pressure and rhythm — never templated, always adjusted to what the body shows in real time.",
  },
  {
    n: "03",
    title: "Contour & Restore",
    body: "Sessions close with sculpting passes and a tailored aftercare plan, so results extend well beyond the table.",
  },
];

export function Methodology() {
  return (
    <section className="py-24 bg-[#F7F5F2] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-6">
              How A Session Unfolds
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight mb-10">
              Three steps.<br />
              <span className="italic">Zero shortcuts.</span>
            </h2>

            <div className="space-y-7">
              {steps.map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.12 }}
                  className="flex gap-5"
                >
                  <span className="font-serif text-2xl text-primary/70 italic leading-none pt-0.5">{s.n}</span>
                  <div>
                    <h3 className="font-serif text-lg text-[#1A1A1A] mb-1">{s.title}</h3>
                    <p className="font-sans text-muted-foreground font-light leading-[1.8] text-sm max-w-md">
                      {s.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={texturesImage}
              alt="Manual lymphatic drainage technique — hands-led treatment at Elysian Paris, London"
              className="w-full aspect-square object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
