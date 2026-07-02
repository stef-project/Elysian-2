import { motion } from "framer-motion";

const benefits = [
  {
    title: "Reduces fluid retention",
    body: "Eases puffiness and that heavy, swollen feeling. Fluid moves and settles naturally.",
  },
  {
    title: "Supports post-surgery recovery",
    body: "Helps settle post-operative swelling after aesthetic procedures, once your surgeon has cleared you.",
  },
  {
    title: "Enhances body-contouring results",
    body: "Paired with cavitation, manual drainage helps your results show.",
  },
  {
    title: "Calms and restores",
    body: "A slow, deeply relaxing rhythm. Many call it the most restful hour of their week.",
  },
];

export function LymphaticDrainage() {
  return (
    <section id="lymphatic-drainage" className="py-20 md:py-32 bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-6">
            Manual Lymphatic Drainage · Kensington, London
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight mb-8">
            A gentler way to reduce swelling,<br />
            <span className="italic">restore lightness, and recover well.</span>
          </h2>
          <p className="font-sans text-muted-foreground font-light leading-[1.9] mb-5">
            A slow, hands-led massage that encourages the natural movement of lymph,
            clearing waste and supporting your immune system. At our private
            Kensington clinic, every session is tailored to your body in real time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-10 mt-16">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
            >
              <div className="w-8 h-[1px] bg-primary mb-5" />
              <h3 className="font-serif text-xl text-[#1A1A1A] mb-3">{b.title}</h3>
              <p className="font-sans text-muted-foreground font-light leading-[1.8] text-sm">
                {b.body}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-16 border-t border-border pt-10 max-w-3xl"
        >
          <p className="font-sans text-muted-foreground font-light leading-[1.9]">
            Every treatment follows the signature <span className="italic text-[#1A1A1A]">Elysian
            Paris Method™</span>, never templated, always calibrated to what your body
            shows. Lymphatic drainage is a wellness and recovery treatment, not a
            medical cure; if you live with a diagnosed condition such as lymphoedema,
            or you are{" "}
            <a
              href="/lymphatic-drainage-after-surgery"
              className="text-primary underline underline-offset-2 hover:text-[#1A1A1A] transition-colors"
            >
              recovering from surgery
            </a>
            , we work alongside your doctor's guidance.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
