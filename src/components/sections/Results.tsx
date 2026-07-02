import { motion } from "framer-motion";
import abdomen1 from "../../assets/result-abdomen-1.webp";
import abdomen2 from "../../assets/result-abdomen-2.webp";
import abdomen4 from "../../assets/result-abdomen-4.webp";
import stomach from "../../assets/result-stomach.webp";
import thighs from "../../assets/result-thighs.webp";
import waist from "../../assets/result-waist.webp";
import legs from "../../assets/result-legs.webp";
import legs2 from "../../assets/result-legs-2.webp";

const results = [
  { src: waist, caption: "Waist · visibly decongested", alt: "Waist manual lymphatic drainage before and after, visible temporary decongestion, Elysian Paris London" },
  { src: stomach, caption: "Stomach · visibly decongested", alt: "Stomach manual lymphatic drainage before and after, visible temporary decongestion, Elysian Paris London" },
  { src: thighs, caption: "Thighs · visibly decongested", alt: "Thigh manual lymphatic drainage before and after, visible temporary reduction in fluid retention, Elysian Paris London" },
  { src: legs2, caption: "Legs · lighter, visibly decongested", alt: "Legs manual lymphatic drainage before and after, lighter and visibly decongested, Elysian Paris London" },
  { src: abdomen4, caption: "Abdomen · before & after", alt: "Abdominal manual lymphatic drainage before and after, Elysian Paris London" },
  { src: abdomen1, caption: "Abdomen · immediate decongestion", alt: "Abdominal manual lymphatic drainage before and after, immediate decongestion, Elysian Paris London" },
  { src: abdomen2, caption: "Abdomen · visibly decongested", alt: "Abdominal manual lymphatic drainage before and after, visible temporary decongestion, Elysian Paris London" },
  { src: legs, caption: "Legs · lighter & decongested", alt: "Legs before and after manual lymphatic drainage, lighter and decongested, Elysian Paris London" },
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
        <div className="flex w-max gap-6 animate-[results-marquee_60s_linear_infinite] group-hover:[animation-play-state:paused]">
          {track.map((r, i) => (
            <figure key={i} className="shrink-0 w-[280px] md:w-[340px]">
              <div className="w-full aspect-square overflow-hidden bg-[#1A1A1A]">
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

      <p className="mt-12 text-center font-sans text-[11px] tracking-[0.1em] uppercase text-muted-foreground/70 max-w-2xl mx-auto px-6">
        Genuine client results, taken in-clinic · Results relate to a visible, temporary
        reduction in fluid retention, not fat loss · Individual results may vary
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
