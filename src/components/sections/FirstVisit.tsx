import { motion } from "framer-motion";

// Comble un vrai vide (aucune page ne rassurait sur le déroulé d'une
// première visite). Construite uniquement à partir de faits déjà vrais
// ailleurs sur le site : sur rendez-vous uniquement, l'étape Assess de la
// Method™, les durées réelles par soin (45–90 min, Services.tsx), les
// recommandations personnalisées mentionnées dans les témoignages — rien
// d'inventé, aucune nouvelle politique de réservation/préparation créée.
const steps = [
  { n: "01", title: "Before", body: "A short message confirming your appointment, with a few questions about what you're looking to achieve. You don't need to arrive knowing exactly which treatment you need, that's decided together." },
  { n: "02", title: "Arrival", body: "By appointment only, one client at a time. 61 Kensington Church Street." },
  { n: "03", title: "Assessment", body: "Every session opens with the Assess step: what your body needs today, not a repeated script. Sessions typically run 45 to 90 minutes depending on the treatment." },
  { n: "04", title: "Aftercare", body: "Simple, practical guidance so results hold after you leave. If a follow-up session is right for you, it's booked the same way as your first." },
];

export function FirstVisit() {
  return (
    <section id="first-visit" className="py-20 md:py-32 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mb-14"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            New Here?
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight">
            Your first<br />
            <span className="italic text-primary">Elysian experience.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <p className="font-serif text-2xl text-primary italic mb-4">{s.n}</p>
              <h3 className="font-sans text-[11px] tracking-[0.2em] uppercase text-[#1A1A1A] mb-3">{s.title}</h3>
              <p className="font-sans text-muted-foreground font-light leading-[1.8] text-sm">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
