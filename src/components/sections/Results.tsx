import { motion } from "framer-motion";
import abdomen1 from "../../assets/result-abdomen-1.webp";
import abdomen2 from "../../assets/result-abdomen-2.webp";
import legs from "../../assets/result-legs.webp";

const results = [
  {
    src: abdomen1,
    caption: "Abdomen · immediate decongestion",
    alt: "Abdominal lymphatic drainage before and after: decongestion and flatter stomach, Elysian Paris",
  },
  {
    src: abdomen2,
    caption: "Abdomen · sculpted & flatter",
    alt: "Abdominal lymphatic drainage before and after: visibly sculpted and flatter stomach, Elysian Paris",
  },
  {
    src: legs,
    caption: "Legs · lighter & decongested",
    alt: "Legs before and after lymphatic drainage: lighter and decongested, Elysian Paris, London",
  },
];

// Duplicated so the band scrolls seamlessly
const track = [...results, ...results];

export function Results() {
  return (
    <section id="results" className="py-20 md:py-32 bg-background border-t border-border overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Real Results
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light">
            Visible from the<br />
            <span className="italic text-primary">very first session.</span>
          </h2>
        </motion.div>
      </div>

      {/* Auto-scrolling band (pauses on hover) */}
      <div className="group relative">
        <div className="flex w-max gap-6 animate-[results-marquee_38s_linear_infinite] group-hover:[animation-play-state:paused]">
          {track.map((r, i) => (
            <figure key={i} className="shrink-0 w-[260px] md:w-[320px]">
              <div className="h-[340px] md:h-[420px] overflow-hidden bg-[#1A1A1A]">
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
            </figure>
          ))}
        </div>
      </div>

      <p className="mt-12 text-center font-sans text-[11px] tracking-[0.1em] uppercase text-muted-foreground/70">
        Genuine client results, taken in-clinic · Individual results may vary
      </p>

      <style>{`
        @keyframes results-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-50% - 0.75rem)); }
        }
      `}</style>
    </section>
  );
}
