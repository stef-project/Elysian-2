import { motion } from "framer-motion";
import { useState } from "react";
import { BOOKING_URL, EMAIL, whatsappWith, mailtoWith } from "../../lib/booking";

const treatmentOptions = [
  { value: "", label: "Select a treatment" },
  { value: "Lymphatic Drainage 1 Zone · £120", label: "Lymphatic Drainage 1 Zone · £120" },
  { value: "Lymphatic Drainage 2 Zones · £220", label: "Lymphatic Drainage 2 Zones · £220" },
  { value: "Maderotherapy · £80", label: "Maderotherapy · £80" },
  { value: "Post-Op Care · £80", label: "Post-Op Care · £80" },
  { value: "Prenatal & Postnatal Massage · £80", label: "Prenatal & Postnatal Massage · £80" },
  { value: "Cavitation Fusion · £150", label: "Cavitation Fusion · £150" },
  { value: "Not sure, please advise", label: "Not sure, please advise" },
];

export function Enquiry() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [treatment, setTreatment] = useState("");
  const [message, setMessage] = useState("");
  // Liens pré-remplis générés à l'envoi (pour l'écran de confirmation).
  const [links, setLinks] = useState({ whatsapp: "", mailto: "" });

  const buildBody = () =>
    [
      "Hello Elysian Paris, I would like to enquire about a treatment.",
      `Name: ${name}`,
      `Email: ${email}`,
      treatment ? `Treatment: ${treatment}` : null,
      message ? `Message: ${message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = buildBody();
    const whatsapp = whatsappWith(body);
    const mailto = mailtoWith("Treatment enquiry — Elysian Paris", body);
    setLinks({ whatsapp, mailto });
    // On ouvre WhatsApp par défaut, mais l'écran de confirmation propose aussi l'e-mail.
    window.open(whatsapp, "_blank", "noopener,noreferrer");
    setSubmitted(true);
  };

  const reset = () => {
    setSubmitted(false);
    setName("");
    setEmail("");
    setTreatment("");
    setMessage("");
    setLinks({ whatsapp: "", mailto: "" });
  };

  return (
    <section id="contact" className="py-20 md:py-32 bg-card border-t border-border">
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
            Book Your Consultation
          </h2>
          <p className="font-sans text-muted-foreground font-light mb-10 leading-relaxed">
            Reserve instantly in the online diary, or send an enquiry below and we
            will respond within 24 hours to confirm your preferred treatment and time.
          </p>

          <div className="mb-14">
            <a
              href={BOOKING_URL}
              data-testid="button-book-consultation"
              className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-14 py-4 hover:bg-primary transition-colors duration-300"
            >
              Book Online Now →
            </a>
          </div>

          {submitted ? (
            <div className="py-16 text-center">
              <div className="w-8 h-[1px] bg-primary mx-auto mb-8" />
              <p className="font-serif text-2xl text-[#1A1A1A] mb-3">Thank you, {name || "there"}.</p>
              <p className="font-sans text-muted-foreground font-light text-sm mb-8 max-w-md mx-auto">
                Your enquiry is ready in WhatsApp — just press send. If WhatsApp did
                not open, or you would rather email us, use one of the options below.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={links.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-confirm-whatsapp"
                  className="font-sans text-[11px] tracking-[0.2em] uppercase bg-[#25D366] text-white px-8 py-3.5 hover:bg-[#1ebe5d] transition-colors duration-300"
                >
                  Open WhatsApp
                </a>
                <a
                  href={links.mailto}
                  data-testid="link-confirm-email"
                  className="font-sans text-[11px] tracking-[0.2em] uppercase border border-[#1A1A1A] text-[#1A1A1A] px-8 py-3.5 hover:bg-[#1A1A1A] hover:text-[#F7F5F2] transition-colors duration-300"
                >
                  Email Us Instead
                </a>
              </div>
              <button
                onClick={reset}
                data-testid="button-send-another"
                className="mt-8 font-sans text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-primary transition-colors duration-300 underline underline-offset-4"
              >
                Send another enquiry
              </button>
            </div>
          ) : (
            <form className="space-y-8 text-left" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="enquiry-name" className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                  Full Name
                </label>
                <input
                  id="enquiry-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-name"
                  className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors duration-300 font-sans text-foreground placeholder:text-muted-foreground/40 text-sm"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="enquiry-email" className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                  Email Address
                </label>
                <input
                  id="enquiry-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                  className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors duration-300 font-sans text-foreground placeholder:text-muted-foreground/40 text-sm"
                  placeholder="Your email address"
                />
              </div>

              <div>
                <label htmlFor="enquiry-treatment" className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                  Treatment of Interest
                </label>
                <select
                  id="enquiry-treatment"
                  name="treatment"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  data-testid="select-treatment"
                  className="w-full bg-transparent border-b border-border py-3 px-0 focus:outline-none focus:border-primary transition-colors duration-300 font-sans text-foreground text-sm appearance-none cursor-pointer"
                >
                  {treatmentOptions.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="enquiry-message" className="block font-sans text-[11px] uppercase tracking-[0.2em] text-foreground/60 mb-3">
                  Message
                </label>
                <textarea
                  id="enquiry-message"
                  name="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
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
                <p className="mt-5 font-sans text-[11px] text-muted-foreground/70">
                  Prefer email? Write to{" "}
                  <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">
                    {EMAIL}
                  </a>
                </p>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
