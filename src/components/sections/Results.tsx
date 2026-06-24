import { motion } from "framer-motion";
import abdomen from "../../assets/result-abdomen-1.webp";
import legs from "../../assets/result-legs.webp";

const results = [
  {
    src: abdomen,
    caption: "Abdomen · immediate decongestion",
    alt: "Abdominal lymphatic drainage results: decongestion and flatter stomach, Elysian Paris",
  },
  {
    src: legs,
    caption: "Legs · lighter & sculpted",
    alt: "Lighter, decongested legs after lymphatic drainage at Elysian Paris, London",
  },
];

export function Results() {
  return (
    <section id="results" className="py-20 md:py-32 bg-background border-t border-border">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Real Results
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light">
            Visible from the<br />
            <span className="italic text-primary">very first session.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((r, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              data-testid={`card-result-${i}`}
            >
              <div className="aspect-square overflow-hidden bg-[#1A1A1A]">
                <img
                  src={r.src}
                  alt={r.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className="mt-4 text-center font-sans text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                {r.caption}
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <p className="mt-12 text-center font-sans text-[11px] tracking-[0.1em] uppercase text-muted-foreground/70">
          Genuine client results, taken in-clinic · Individual results may vary
        </p>
      </div>
    </section>
  );
}
