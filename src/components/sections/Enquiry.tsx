import { motion } from "framer-motion";
import { useState } from "react";

export function Enquiry() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="contact" className="py-32 bg-card border-t border-border">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-6">
            Begin Your Journey
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light mb-4">
            Reserve a Treatment
          </h2>
          <p className="font-sans text-muted-foreground font-light mb-14 leading-relaxed">
            Contact us to arrange your appointment. We will respond within 24 hours
            to confirm your preferred treatment and time.
          </p>

          {submitted ? (
            <div className="py-16 text-center">
              <div className="w-8 h-[1px] bg-primary mx-auto mb-8" />
              <p className="font-serif text-2xl text-[#1A1A1A] mb-3">Thank you.</p>
              <p className="font-sans text-muted-foreground font-light text-sm">
                We will be in touch shortly.
              </p>
            </div>
          ) : (
            <form
              className="space-y-8 text-left"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <div>
                <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  data-testid="input-name"
                  className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors duration-300 font-sans text-foreground placeholder:text-muted-foreground/40 text-sm"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  data-testid="input-email"
                  className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors duration-300 font-sans text-foreground placeholder:text-muted-foreground/40 text-sm"
                  placeholder="Your email address"
                />
              </div>

              <div>
                <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                  Treatment of Interest
                </label>
                <select
                  data-testid="select-treatment"
                  className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors duration-300 font-sans text-foreground text-sm appearance-none cursor-pointer"
                >
                  <option value="">Select a treatment</option>
                  <option value="lymphatic-1z">Lymphatic Drainage 1 Zone — £120</option>
                  <option value="lymphatic-2z">Lymphatic Drainage 2 Zones — £240</option>
                  <option value="maderotherapy">Maderotherapy — £80</option>
                  <option value="post-op">Post-Operative Care — £80</option>
                  <option value="prenatal">Prenatal &amp; Postnatal Massage — £80</option>
                  <option value="cavitation">Cavitation Fusion — £150</option>
                  <option value="unsure">Not sure — please advise</option>
                </select>
              </div>

              <div>
                <label className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                  Message
                </label>
                <textarea
                  rows={4}
                  data-testid="input-message"
                  className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors duration-300 font-sans text-foreground placeholder:text-muted-foreground/40 text-sm resize-none"
                  placeholder="Any additional context or preferences..."
                />
              </div>

              <div className="pt-6 text-center">
                <button
                  type="submit"
                  data-testid="button-send-enquiry"
                  className="font-sans text-xs tracking-[0.2em] uppercase border border-[#1A1A1A] text-[#1A1A1A] px-14 py-4 hover:bg-[#1A1A1A] hover:text-[#F7F5F2] transition-colors duration-300"
                >
                  Send Enquiry
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
