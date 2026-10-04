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

          {/* Left: portrait image. Swap-ready: a professional portrait only
              needs to replace `clinicianImage`'s import/src, no layout
              change required (fixed aspect-[3/4] slot, object-cover). */}
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
              loading="lazy"
              decoding="async"
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
                The Woman Behind Elysian
              </p>
              <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight mb-4">
                Stephanie <span className="italic">the hands behind<br />every session.</span>
              </h2>
              <p className="font-sans text-sm text-muted-foreground font-light mb-6">
                Founder and practitioner, Elysian Paris.
              </p>
              <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-primary mb-8">
                Personal expertise · Technical precision · Individual care · Complete discretion
              </p>
              <div className="w-12 h-[1px] bg-primary mb-8" />
              <p className="font-sans text-muted-foreground font-light leading-[1.9] max-w-lg mb-6">
                Stephanie founded Elysian Paris in 2023, after training that
                took her back to France again and again, including in the
                renowned Manuela Shala method. Rather than settle on one
                discipline, she trained across several, manual lymphatic
                drainage, sculpting and contouring among them. Every session,
                from first consultation to last, is hers alone to deliver.
              </p>
              <p className="font-sans text-muted-foreground font-light leading-[1.9] max-w-lg">
                "I didn't want to offer one technique. I wanted to bring
                together everything I'd trained in, which meant not stopping
                at one certification, but returning to France, again and
                again, for the long-form training it takes to actually
                master each one, not just learn it."
              </p>
            </motion.div>

            <div className="space-y-0 divide-y divide-border">
              {[
                {
                  label: "What Makes My Approach Different",
                  body: "Most practitioners specialise in one technique. I trained in several, manual lymphatic drainage, sculpting, contouring, and built the Elysian Paris Method™ by combining what each does best, rather than offering them as separate menu items.",
                },
                {
                  label: "Why Every Treatment Is Personalised",
                  body: "Every body is different, so every session starts with an assessment, not a script. What's actually in front of me that day decides the treatment, never a routine repeated on everyone who walks in.",
                },
                {
                  label: "What I Believe",
                  body: "Technique isn't something you finish learning, it's something you keep training in. No shortcuts, no delegation, from first consultation to last.",
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
