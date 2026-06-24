import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import l2Image from "../../assets/l2.webp";
import l1Image from "../../assets/l1.webp";
import sponImage from "../../assets/spon.webp";
import massageImage from "../../assets/massage.webp";
import prenatalImage from "../../assets/prenatal.webp";
import cavitationImage from "../../assets/cavitation.webp";

const treatments = [
  {
    number: "01",
    name: "Lymphatic Drainage",
    subtitle: "1 Zone",
    duration: "60 min",
    price: "£120",
    calendarUrl: "https://calendar.app.google/Ev8ZV3UJwHgaE8uE9",
    image: l2Image,
    description:
      "A targeted treatment focusing on either the legs or the abdominal area. Stimulates the lymphatic system, reduces localised swelling, and restores natural balance. Part of The Elysian Paris Method®.",
    benefits: ["Reduces inflammation", "Improves circulation", "Boosts immunity", "Post-surgery recovery"],
  },
  {
    number: "02",
    name: "Lymphatic Drainage",
    subtitle: "2 Zones",
    duration: "90 min",
    price: "£240",
    calendarUrl: "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ03Mt0KA7xJm4fp59G8i-8132VCCEBaNf6tAUbZ6cf-aHA0WGCe-2eHo1Aq4U4l4c-ezs2igFpq",
    image: l1Image,
    description:
      "Focusing on the legs and abdominal area, including the sides of the back. Delivers immediate lightness, improved contour, and lasting wellness benefits where fluid retention most often accumulates.",
    benefits: ["Reduces inflammation", "Improves circulation", "Boosts immunity", "Post-surgery recovery"],
  },
  {
    number: "03",
    name: "Maderotherapy",
    subtitle: null,
    duration: "60 min",
    price: "£80",
    calendarUrl: "https://calendar.app.google/n6jfj1dXiKmJoh6D6",
    image: sponImage,
    description:
      "A sculpting massage using wooden tools to stimulate circulation, contour the body, and refine skin texture. Each session delivers visible results through precision pressure and intentional movement.",
    benefits: ["Reduces cellulite", "Enhances circulation", "Improves skin tone", "Natural detoxification"],
  },
  {
    number: "04",
    name: "Post-Operative Care",
    subtitle: null,
    duration: "60 min",
    price: "£80",
    calendarUrl: "https://calendar.app.google/B9JEmHdYKT9i5AbbA",
    image: massageImage,
    description:
      "A gentle treatment designed to support the body after surgery. Specialist techniques encourage circulation, reduce swelling, and restore mobility — always respecting the pace of your recovery.",
    benefits: ["Accelerates recovery", "Relieves discomfort", "Softens scar tissue", "Enhances healing"],
  },
  {
    number: "05",
    name: "Prenatal & Postnatal Massage",
    subtitle: null,
    duration: "45–60 min",
    price: "£80",
    calendarUrl: "https://calendar.app.google/ZsAmpyZGnuiGTukW6",
    image: prenatalImage,
    description:
      "A tailored treatment supporting mothers during and after pregnancy. Gentle techniques relieve back tension and reduce swelling before birth; postnatal sessions focus on recovery and restoring vitality.",
    benefits: ["Relieves back tension", "Reduces swelling", "Enhances circulation", "Deep relaxation"],
  },
  {
    number: "06",
    name: "Cavitation Fusion",
    subtitle: null,
    duration: "90 min",
    price: "£150",
    calendarUrl: "https://calendar.app.google/q5HJGmc1cWBL7wmq5",
    image: cavitationImage,
    description:
      "A high-performance body contouring treatment combining advanced cavitation technology with manual lymphatic drainage. Ultrasound waves target stubborn fat non-invasively; lymphatic massage enhances results.",
    benefits: ["Body contouring", "Reduced fluid retention", "Non-invasive fat reduction", "Enhanced detox"],
  },
];

export function Services() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section id="treatments" className="bg-card">
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6"
        >
          <div>
            <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
              Signature Treatments
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight">
              Each treatment is designed<br />
              <span className="italic">with precision.</span>
            </h2>
          </div>
          <p className="font-sans text-sm text-muted-foreground font-light max-w-xs leading-relaxed">
            Thoughtfully crafted to honour your wellness journey. Every session is tailored, never routine.
          </p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="divide-y divide-border">
          {treatments.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: i * 0.05 }}
              data-testid={`card-treatment-${i}`}
            >
              {/* Row header — always visible, clickable to expand */}
              <button
                className="w-full text-left py-8 grid grid-cols-12 gap-4 items-center group"
                onClick={() => setExpanded(expanded === i ? null : i)}
                aria-expanded={expanded === i}
              >
                <div className="col-span-1 hidden md:block">
                  <span className="font-sans text-[11px] tracking-[0.15em] text-muted-foreground/50">
                    {t.number}
                  </span>
                </div>
                <div className="col-span-8 md:col-span-6">
                  <h3 className="font-serif text-xl md:text-2xl text-[#1A1A1A] leading-tight">
                    {t.name}
                    {t.subtitle && (
                      <span className="italic text-muted-foreground font-light"> — {t.subtitle}</span>
                    )}
                  </h3>
                </div>
                <div className="col-span-2 hidden md:flex items-center gap-4">
                  <span className="font-sans text-xs tracking-[0.1em] text-muted-foreground uppercase">
                    {t.duration}
                  </span>
                </div>
                <div className="col-span-2 text-right md:text-left">
                  <span className="font-serif text-xl text-[#1A1A1A] px-3 py-1 border border-primary/30 bg-primary/[0.06] inline-block">{t.price}</span>
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  <span className={`font-sans text-[11px] tracking-widest text-muted-foreground transition-transform duration-300 ${expanded === i ? "rotate-180" : ""}`}>
                    ↓
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              <AnimatePresence initial={false}>
                {expanded === i && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pb-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                      {/* Real treatment photo */}
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={t.image}
                          alt={t.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Details */}
                      <div className="flex flex-col justify-between h-full gap-6">
                        <div>
                          <p className="font-sans text-sm text-muted-foreground font-light leading-[1.9] mb-6">
                            {t.description}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {t.benefits.map((b, j) => (
                              <div key={j} className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                                <span className="font-sans text-xs tracking-[0.08em] text-muted-foreground">
                                  {b}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-6 flex-1">
                            <div>
                              <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Duration</p>
                              <p className="font-sans text-sm text-foreground">{t.duration}</p>
                            </div>
                          </div>
                          <div className="flex items-stretch gap-3">
                            <div className="flex flex-col justify-center px-6 py-3 border border-primary/40 bg-primary/[0.08]">
                              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary mb-0.5">Investment</p>
                              <p className="font-serif text-2xl text-[#1A1A1A] leading-none">{t.price}</p>
                            </div>
                            <a
                              href={t.calendarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`button-reserve-${i}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-8 py-3 hover:bg-primary transition-colors duration-300 inline-flex items-center"
                            >
                              Reserve →
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Treatment photo strip */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="mt-16 grid grid-cols-3 md:grid-cols-6 gap-0"
      >
        {treatments.map((t, i) => (
          <a
            key={i}
            href={t.calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative overflow-hidden aspect-square group block"
            data-testid={`strip-treatment-${i}`}
          >
            <img
              src={t.image}
              alt={t.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-[#1A1A1A]/0 group-hover:bg-[#1A1A1A]/50 transition-colors duration-300 flex items-end p-4">
              <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-[#F7F5F2] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {t.name}
              </p>
            </div>
          </a>
        ))}
      </motion.div>
    </section>
  );
}
