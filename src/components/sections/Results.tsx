import { motion } from "framer-motion";
import abdomen1 from "../../assets/result-abdomen-1.webp";
import abdomen2 from "../../assets/result-abdomen-2.webp";
import legs from "../../assets/result-legs.webp";

const results = [
  { src: abdomen1, alt: "Abdominal lymphatic drainage results — decongestion and flatter stomach, Elysian Paris" },
  { src: abdomen2, alt: "Stomach contouring results after lymphatic drainage at Elysian Paris, London" },
  { src: legs, alt: "Lighter, decongested legs after lymphatic drainage at Elysian Paris, London" },
];

export function Results() {
  return (
    <section id="results" className="py-32 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto px-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="aspect-square overflow-hidden bg-[#1A1A1A]"
              data-testid={`card-result-${i}`}
            >
              <img
                src={r.src}
                alt={r.alt}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center font-sans text-[11px] tracking-[0.1em] uppercase text-muted-foreground/70">
          Genuine client results, taken in-clinic · Individual results may vary
        </p>
      </div>
    </section>
  );
}
