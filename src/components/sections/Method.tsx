import { motion } from "framer-motion";

const pillars = [
  {
    title: "Fully tailored",
    body: "Every treatment is built around you — heavy legs, bloating, fluid retention, swelling or sculpting goals are mapped before we begin.",
  },
  {
    title: "Visible from session one",
    body: "A precise combination of techniques designed so that many clients see and feel a real difference from the very first session.",
  },
  {
    title: "Results that last",
    body: "Hands-on treatment is paired with personalised guidance and lifestyle recommendations, so your results hold long after you leave the table.",
  },
  {
    title: "Exclusive to the UK",
    body: "A signature, in-house method you will not find anywhere else in the country — refined over years of dedicated practice.",
  },
];

export function Method() {
  return (
    <section id="method" className="py-32 bg-[#1A1A1A] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-[#BF944A] mb-6">
            The only practice in the UK · Kensington, London
          </p>
          <h2 className="font-serif text-4xl md:text-6xl text-[#F7F5F2] font-light leading-[1.05] mb-8">
            The Elysian Paris<br />
            <span className="italic text-[#E2CAA2]">Method®.</span>
          </h2>
          <div className="w-12 h-[1px] bg-[#BF944A] mb-8" />
          <p className="font-sans text-lg text-[#F7F5F2]/80 font-light leading-[1.9] mb-5">
            Where body contouring meets lasting wellbeing. An exclusive treatment
            approach developed in-house over years of practice — helping women feel
            lighter, reduce water retention and enhance their natural body contours.
          </p>
          <p className="font-sans text-[#F7F5F2]/55 font-light leading-[1.9] mb-5">
            This signature method combines advanced lymphatic drainage, body-contouring
            expertise and holistic wellness principles to deliver visible results from
            the very first session for many clients. It is the only method of its kind
            offered anywhere in the UK.
          </p>
          <p className="font-sans text-[#F7F5F2]/55 font-light leading-[1.9]">
            Our founder trained in the renowned <span className="italic text-[#F7F5F2]/80">Manuela
            Shala</span> technique — and in other established schools of lymphatic and
            body work — then spent years adapting what she learned with her own
            expertise, evolving it into the Elysian Paris Method®: a method entirely
            her own.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12 mt-20">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <p className="font-serif text-2xl text-[#BF944A] italic mb-4">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="font-serif text-xl text-[#F7F5F2] mb-3">{p.title}</h3>
              <p className="font-sans text-[#F7F5F2]/50 font-light leading-[1.8] text-sm">
                {p.body}
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
