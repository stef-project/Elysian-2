import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "I had tried several treatments before, but with Elysian Paris the results were immediate. I felt lighter as soon as the session was over.",
    name: "Kim",
    title: "London",
  },
  {
    quote: "My legs constantly felt heavy and swollen. After every session, I notice a real difference and feel so much more comfortable.",
    name: "Emma",
    title: "Surrey",
  },
  {
    quote: "The results are amazing, but what I appreciate most is the advice. I always leave with simple recommendations that genuinely make a difference.",
    name: "A.",
    title: "London",
  },
  {
    quote: "I have been coming regularly for over three years and simply couldn't be without it. The results are consistent, and I always feel my best after each treatment.",
    name: "Stella",
    title: "London",
  },
];

export function Quotes() {
  return (
    <section className="py-20 md:py-32 bg-[#1A1A1A]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-[#BF944A] mb-4">
            Client Stories
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#F7F5F2] font-light">
            Discover how our treatments<br />
            <span className="italic text-[#E2CAA2]">transform lives.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#F7F5F2]/10">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
              className="bg-[#1A1A1A] p-12"
              data-testid={`card-testimonial-${i}`}
            >
              <div className="w-8 h-[1px] bg-[#BF944A] mb-8" />
              <p className="font-serif text-2xl md:text-3xl text-[#F7F5F2]/90 font-light leading-snug mb-10">
                "{t.quote}"
              </p>
              <div>
                <p className="font-sans text-sm text-[#F7F5F2] tracking-wide">{t.name}</p>
                <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-[#F7F5F2]/40 mt-1">
                  {t.title}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 grid grid-cols-3 gap-8 text-center border-t border-[#F7F5F2]/10 pt-14"
        >
          {[
            { value: "★★★★★", label: "Client rating" },
            { value: "3 yrs+", label: "Of loyal clients" },
            { value: "1 of 1", label: "Method® in the UK" },
          ].map((s, i) => (
            <div key={i}>
              <p className="font-serif text-3xl text-[#BF944A] mb-2">{s.value}</p>
              <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-[#F7F5F2]/40">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
