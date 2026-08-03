import { motion } from "framer-motion";
import { TopBar } from "../components/layout/TopBar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { trackBookClick } from "../lib/analytics";

// Lien de réservation du soin « Cavitation Fusion » (même lien que Services.tsx, page dédiée SEO).
const BOOK_URL = "https://calendar.app.google/q5HJGmc1cWBL7wmq5";

const benefits = [
  "Body contouring",
  "Reduced fluid retention",
  "Non-invasive fat reduction",
  "Enhanced detox",
];

const faqs = [
  {
    q: "What is Cavitation Fusion?",
    a: "A high-performance body contouring treatment combining advanced cavitation technology with manual lymphatic drainage. Ultrasound waves target stubborn fat non-invasively; lymphatic massage enhances results.",
  },
  {
    q: "Is cavitation painful?",
    a: "No. It is a non-invasive treatment. Most clients find the ultrasound phase comfortable and the manual lymphatic drainage that follows deeply relaxing.",
  },
  {
    q: "How long does a session take?",
    a: "A Cavitation Fusion session lasts 90 minutes, combining the ultrasound cavitation phase with manual lymphatic drainage.",
  },
  {
    q: "Where are you located?",
    a: "Our private studio is at 61 Kensington Church Street, London W8 4BA, in the heart of Kensington, Central London. By appointment only.",
  },
];

export default function CavitationBodyContouring() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <TopBar />

      {/* Simple header */}
      <header className="border-b border-[#E8E6E1] bg-[rgba(254,253,251,0.96)]">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="/" className="font-serif text-2xl tracking-[0.25em] uppercase text-[#1A1A1A]">
            Elysian Paris
          </a>
          <a
            href={BOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBookClick("cavitation_header")}
            className="font-sans text-[11px] tracking-[0.18em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-6 py-2.5 hover:bg-[#BF944A] transition-colors duration-300"
          >
            Book Now
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-24 md:py-32 bg-[#F7F5F2]">
          <div className="max-w-4xl mx-auto px-6">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-6"
            >
              Cavitation Fusion · Kensington, London
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1 }}
              className="font-serif text-4xl md:text-6xl text-[#1A1A1A] font-light leading-[1.1] mb-8"
            >
              Cavitation &amp;<br />
              <span className="italic">Body Contouring in London.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="font-sans text-lg text-muted-foreground font-light leading-[1.9] max-w-2xl"
            >
              A high-performance, non-invasive body contouring treatment
              combining advanced ultrasound cavitation with manual lymphatic
              drainage, delivered in a private Kensington studio.
            </motion.p>
          </div>
        </section>

        {/* Why */}
        <section className="py-24 bg-background">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-8">
              Why Cavitation Fusion?
            </h2>
            <p className="font-sans text-muted-foreground font-light leading-[1.9] mb-5">
              Ultrasound waves target stubborn fat non-invasively, breaking it
              down so the body can process it naturally. Manual lymphatic
              drainage follows to help move that fluid, enhancing the
              treatment's results and easing any heaviness.
            </p>
            <p className="font-sans text-muted-foreground font-light leading-[1.9]">
              A 90-minute session, combining both techniques in one visit,
              part of The Elysian Paris Method™.
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-24 bg-[#F7F5F2]">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-10">
              What it can help with
            </h2>
            <ul className="space-y-5">
              {benefits.map((b) => (
                <li key={b} className="flex gap-4 items-start">
                  <span className="font-serif text-primary italic text-xl leading-none pt-1">·</span>
                  <span className="font-sans text-muted-foreground font-light leading-[1.8]">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-background">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-12">
              Cavitation &amp; body contouring: your questions
            </h2>
            <div className="divide-y divide-border">
              {faqs.map((f) => (
                <div key={f.q} className="py-7">
                  <h3 className="font-serif text-lg text-[#1A1A1A] mb-2">{f.q}</h3>
                  <p className="font-sans text-muted-foreground font-light leading-[1.8] text-[15px]">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-28 bg-[#1A1A1A] text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-4xl text-[#F7F5F2] font-light mb-6">
              Book your Cavitation Fusion session
            </h2>
            <p className="font-sans text-[#F7F5F2]/60 font-light leading-[1.9] mb-10">
              90 minutes, £150. Private, by appointment only, in Kensington.
            </p>
            <a
              href={BOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackBookClick("cavitation_cta")}
              className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#BF944A] text-[#1A1A1A] px-10 py-4 hover:bg-[#E2CAA2] transition-colors duration-300"
            >
              Book a Consultation
            </a>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
