import { motion } from "framer-motion";
import clinicianImage from "../../assets/founder.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function Philosophy() {
  return (
    <section id="about" className="py-20 md:py-32 bg-background">
      <div className="max-w-6xl mx-auto px-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

          {/* Left: portrait image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4"
          >
            <img
              src={clinicianImage}
              alt="Founder and French-trained lymphatic drainage therapist at Elysian Paris, Kensington, London"
              className="w-full aspect-[3/4] object-cover object-top"
            />
            <div className="mt-6 flex items-center gap-4">
              <div className="w-6 h-[1px] bg-primary" />
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                French-trained therapist · Est. 2023
              </p>
            </div>
          </motion.div>

          {/* Right: headline + copy + pillars */}
          <div className="lg:col-span-8 space-y-0">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              custom={0}
              variants={fadeUp}
              className="mb-12"
            >
              <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-6">
                Welcome to Elysian Paris
              </p>
              <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight mb-8">
                Wellness is<br />
                <span className="italic">a private art.</span>
              </h2>
              <div className="w-12 h-[1px] bg-primary mb-8" />
              <p className="font-sans text-muted-foreground font-light leading-[1.9] max-w-lg">
                A private Kensington clinic for manual lymphatic drainage and
                bespoke body contouring. Every session is tailored with precision
                and discretion. Nothing routine, everything intentional.
              </p>
            </motion.div>

            <div className="space-y-0 divide-y divide-border">
              {[
                {
                  label: "The Elysian Paris Method®",
                  body: "Our signature method merges manual lymphatic drainage with body contouring, the only approach of its kind in the UK.",
                },
                {
                  label: "Certified Practitioner",
                  body: "Every treatment is delivered by a certified specialist. No shortcuts, no delegation, from first consultation to last.",
                },
                {
                  label: "Total Discretion",
                  body: "By appointment only, so each client receives undivided attention in complete privacy.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  custom={i}
                  variants={fadeUp}
                  className="py-7"
                >
                  <h3 className="font-serif text-xl text-[#1A1A1A] mb-2">{item.label}</h3>
                  <p className="font-sans text-muted-foreground font-light leading-[1.8] text-sm max-w-lg">
                    {item.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-20 pt-12 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { value: "French", label: "Trained therapist" },
            { value: "Session 1", label: "Visible results" },
            { value: "6", label: "Signature treatments" },
            { value: "W8", label: "Kensington, London" },
          ].map((stat, i) => (
            <div key={i}>
              <p className="font-serif text-3xl text-[#1A1A1A] mb-2">{stat.value}</p>
              <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
