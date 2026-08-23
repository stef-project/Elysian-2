import { motion } from "framer-motion";
import { TopBar } from "../components/layout/TopBar";
import { Footer } from "../components/layout/Footer";
import { WhatsAppButton } from "../components/ui/WhatsAppButton";
import { trackBookClick } from "../lib/analytics";
import { buildHealthCheckUrl } from "../lib/contraindications";
import { TestimonialSection } from "../components/sections/TestimonialSection";

// Lien de réservation du soin « Post-Operative Care » — jamais direct : passe
// par /health-check (contre-indications) avant le calendrier réel.
const BOOK_URL = buildHealthCheckUrl("post-op", "https://calendar.app.google/B9JEmHdYKT9i5AbbA");

const procedures = [
  { title: "Liposuction & Lipo 360", body: "Support for the swelling and fluid that follow liposuction and 360 contouring." },
  { title: "BBL (Brazilian Butt Lift)", body: "Gentle drainage to help settle post-op oedema while protecting the treated areas." },
  { title: "Tummy Tuck (Abdominoplasty)", body: "Eases tightness and swelling across the abdomen as the body heals." },
  { title: "Breast Surgery", body: "Comfort-focused drainage after augmentation, reduction or lift, once cleared." },
  { title: "Mommy Makeover", body: "A tailored recovery plan for combined procedures." },
  { title: "Other Cosmetic Surgery", body: "Most aesthetic and cosmetic procedures benefit from post-op lymphatic support." },
];

const benefits = [
  "Reduce post-op swelling and fluid retention",
  "Ease tightness, heaviness and discomfort",
  "Support circulation and the body's natural healing rhythm",
  "Help you feel more comfortable and mobile as you recover",
];

const faqs = [
  {
    q: "When can I start post-op lymphatic drainage?",
    a: "Timing depends on your procedure and your surgeon's advice. Many clients begin within the first weeks post-op, once their surgeon has given clearance. We always recommend confirming with your surgeon first.",
  },
  {
    q: "How many sessions will I need post-op?",
    a: "It varies by procedure and how your body responds. A short course of sessions usually offers the best support during recovery. We tailor a plan for you at your first visit.",
  },
  {
    q: "Does post-op lymphatic drainage hurt?",
    a: "No. The technique is gentle, slow and rhythmic, and is adapted to post-op bodies. Most clients find it soothing and comfortable.",
  },
  {
    q: "Where are you located?",
    a: "Our private studio is at 61 Kensington Church Street, London W8 4BA, in the heart of Kensington, Central London. By appointment only.",
  },
];

export default function AfterSurgery() {
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
            onClick={() => trackBookClick("after_surgery_header")}
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
              Post-Op Recovery · Kensington, London
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1 }}
              className="font-serif text-4xl md:text-6xl text-[#1A1A1A] font-light leading-[1.1] mb-8"
            >
              Lymphatic Drainage<br />
              <span className="italic">Post-Op in London.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="font-sans text-lg text-muted-foreground font-light leading-[1.9] max-w-2xl"
            >
              Gentle, hands-led manual lymphatic drainage to help reduce swelling,
              ease discomfort and support a smoother recovery after cosmetic and
              aesthetic surgery, delivered through The Elysian Paris Method™ in a
              private Kensington studio.
            </motion.p>
          </div>
        </section>

        {/* Why */}
        <section className="py-24 bg-background">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-8">
              Why lymphatic drainage post-op?
            </h2>
            <p className="font-sans text-muted-foreground font-light leading-[1.9] mb-5">
              After cosmetic or aesthetic surgery, the body naturally produces extra
              fluid and swelling as part of healing. Gentle manual lymphatic drainage
              encourages that fluid to move and settle, which can ease the feeling of
              tightness and heaviness and support your body's recovery.
            </p>
            <p className="font-sans text-muted-foreground font-light leading-[1.9]">
              It is one of the most widely recommended forms of post-op care
              after procedures such as liposuction, BBL and tummy tucks, always begun
              once your surgeon has given clearance.
            </p>
          </div>
        </section>

        {/* Procedures */}
        <section className="py-24 bg-[#F7F5F2]">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-14">
              Procedures we commonly support
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
              {procedures.map((p) => (
                <div key={p.title}>
                  <div className="w-8 h-[1px] bg-primary mb-5" />
                  <h3 className="font-serif text-xl text-[#1A1A1A] mb-3">{p.title}</h3>
                  <p className="font-sans text-muted-foreground font-light leading-[1.8] text-sm">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-24 bg-background">
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
            <p className="font-sans text-sm text-muted-foreground/80 font-light leading-[1.8] mt-10 border-t border-border pt-8">
              Lymphatic drainage is a supportive wellness and recovery treatment, not
              medical care. Always follow your surgeon's guidance and obtain clearance
              before booking post-op drainage.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-[#F7F5F2]">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-12">
              Post-op drainage: your questions
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

        <TestimonialSection
          eyebrow="Client Stories"
          heading="Recovering, cared for"
          testimonials={[
            {
              quote: "I had a tummy tuck in March and I was terrified of doing something wrong afterwards. My surgeon cleared me and I came here three days later. The swelling came down faster than I expected and I never once felt like I was being rushed. She checked my scar at every session.",
              name: "Lea",
              detail: "post-operative drainage",
            },
            {
              quote: "Six sessions after my liposuction. What I appreciated most was that she knew exactly what she couldn't do: no pressure on the area, nothing risky. I felt safe, which is not something I felt anywhere else I called.",
              name: "Anna",
              detail: "post-operative drainage",
            },
          ]}
        />

        {/* CTA */}
        <section className="py-28 bg-[#1A1A1A] text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-4xl text-[#F7F5F2] font-light mb-6">
              Begin your recovery with us
            </h2>
            <p className="font-sans text-[#F7F5F2]/60 font-light leading-[1.9] mb-10">
              Once your surgeon has given clearance, we'll build a recovery plan
              tailored to your procedure. Private, gentle, by appointment only.
            </p>
            <a
              href={BOOK_URL}
              onClick={() => trackBookClick("after_surgery_cta")}
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
