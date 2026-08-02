import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is manual lymphatic drainage?",
    a: "Manual lymphatic drainage is a gentle, rhythmic massage that stimulates the lymphatic system to encourage the natural flow of lymph, helping the body clear excess fluid and reduce swelling.",
  },
  {
    q: "What are the benefits of lymphatic drainage?",
    a: "It can reduce fluid retention and puffiness, ease a feeling of heaviness, support post-op recovery, enhance body-contouring results and promote deep relaxation.",
  },
  {
    q: "Is lymphatic drainage good after cosmetic surgery?",
    a: "Yes. It is widely used after aesthetic and cosmetic procedures to help settle post-op swelling and support healing. We recommend starting once your surgeon has given clearance.",
  },
  {
    q: "Does lymphatic drainage hurt?",
    a: "No. It is one of the gentlest treatments available: light, slow and rhythmic. Most clients find it deeply relaxing rather than uncomfortable.",
  },
  {
    q: "How many sessions will I need?",
    a: "It depends on your goals. Some clients come for a single reset; for post-op recovery or visible contouring, a short course of sessions usually gives the best results. We advise you at your first visit.",
  },
  {
    q: "How much does lymphatic drainage cost in London?",
    a: "At Elysian Paris, manual lymphatic drainage starts at £120 for one zone (legs or abdomen) and £220 for two zones.",
  },
  {
    q: "Where is your lymphatic drainage clinic located?",
    a: "Our private studio is at 61 Kensington Church Street, London W8 4BA, in the heart of Kensington, Central London. Treatments are by appointment only.",
  },
  {
    q: "How do I book an appointment?",
    a: "You can book online, message us on WhatsApp, or email info@elysian-institute.com. We respond within 24 hours.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-32 bg-[#F7F5F2] overflow-hidden">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-14"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-6">
            Frequently Asked Questions
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight">
            Lymphatic drainage,<br />
            <span className="italic">answered.</span>
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border">
              <AccordionTrigger className="font-serif text-lg text-[#1A1A1A] text-left hover:no-underline py-6">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="font-sans text-muted-foreground font-light leading-[1.8] text-[15px] pb-6">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
