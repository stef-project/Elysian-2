import { motion } from "framer-motion";
import equipmentImage from "../../assets/clinic-reception.webp";

export function Facility() {
  return (
    <section id="location" className="py-20 md:py-32 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
          >
            <img
              src={equipmentImage}
              alt="Elysian Paris lymphatic drainage clinic interior — Kensington, Central London"
              className="w-full aspect-[4/5] object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
          >
            <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-6">
              Visit Our Clinic
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight mb-10">
              Central London.<br />
              <span className="italic">Entirely private.</span>
            </h2>

            <div className="space-y-8">
              <div className="border-t border-border pt-7">
                <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
                  Address
                </p>
                <p className="font-sans text-foreground font-light leading-relaxed">
                  61 Kensington Church Street<br />
                  London, W8 4BA
                </p>
                <a
                  href="https://maps.google.com/?q=61+Kensington+Church+Street+London+W8+4BA"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-view-map"
                  className="inline-block mt-3 font-sans text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-primary border-b border-muted-foreground/30 hover:border-primary pb-0.5 transition-colors duration-300"
                >
                  View on map →
                </a>
              </div>

              <div className="border-t border-border pt-7">
                <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
                  Opening Hours
                </p>
                <p className="font-sans text-foreground font-light">
                  Monday to Sunday
                </p>
                <p className="font-sans text-muted-foreground font-light text-sm mt-1">
                  By appointment only
                </p>
              </div>

              <div className="border-t border-border pt-7">
                <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
                  Enquiries
                </p>
                <a
                  href="mailto:info@elysian-institute.com"
                  data-testid="link-email"
                  className="font-sans text-foreground font-light hover:text-primary transition-colors duration-300"
                >
                  info@elysian-institute.com
                </a>
              </div>

              <div className="border-t border-border pt-7">
                <a
                  href="#contact"
                  data-testid="button-book-consultation"
                  className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-10 py-4 hover:bg-primary transition-colors duration-300"
                >
                  Book a Consultation
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
