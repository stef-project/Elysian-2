import { motion } from "framer-motion";
import { WHATSAPP_URL } from "../../lib/booking";
import { trackEvent } from "../../lib/analytics";

// Entrée par intention plutôt que par catalogue — la cliente se reconnaît
// dans une situation, pas dans une liste de noms de soins. Chaque carte
// renvoie vers #treatments (section Services juste en dessous), qui reste la
// seule source de vérité pour les liens de réservation réels (passage
// obligé par /health-check) — pas de logique de lien dupliquée ici.
const intents = [
  {
    label: "I want to feel lighter",
    treatment: "Lymphatic Sculpting",
    detail: "1 or 2 zones · 60–90 min · from £120",
  },
  {
    label: "I want to refine my silhouette",
    treatment: "Body Sculpting",
    detail: "Maderotherapy & Cavitation Fusion · from £120",
  },
  {
    label: "I'm recovering from surgery",
    treatment: "Post-Op Care",
    detail: "60 min · £130 · package: 10 sessions, £1,200",
  },
  {
    label: "I'm pregnant or postpartum",
    treatment: "Maternal Care",
    detail: "45–60 min · £90",
  },
];

export function WhatBringsYou() {
  return (
    <section className="py-20 md:py-32 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mb-14"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
            Where To Begin
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light leading-tight">
            What brings you<br />
            <span className="italic text-primary">to Elysian?</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {intents.map((it, i) => (
            <motion.a
              key={it.label}
              href="#treatments"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group border border-border bg-card px-8 py-7 hover:border-primary transition-colors duration-300"
            >
              <p className="font-sans text-[11px] tracking-[0.15em] uppercase text-muted-foreground mb-3">
                {it.label}
              </p>
              <h3 className="font-serif text-2xl text-[#1A1A1A] mb-2 group-hover:text-primary transition-colors">
                {it.treatment}
              </h3>
              <p className="font-sans text-sm text-muted-foreground font-light">{it.detail}</p>
            </motion.a>
          ))}
        </div>

        {/* Elysian Signature — emplacement stratégique, pas un produit fini.
            Aucune durée/prix/protocole inventés tant que le traitement phare
            n'est pas validé (voir stratégie §06). Pas de lien de réservation
            factice : seulement un contact direct pour qui serait intéressée. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-5 border border-dashed border-primary/40 bg-primary/[0.04] px-8 py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <p className="font-sans text-[11px] tracking-[0.15em] uppercase text-primary mb-2">
              I want the full Elysian experience
            </p>
            <h3 className="font-serif text-2xl text-[#1A1A1A] mb-1">The Elysian Signature</h3>
            <p className="font-sans text-sm text-muted-foreground font-light">Our flagship, fully-combined experience. In development.</p>
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("signature_enquiry_click")}
            className="inline-block shrink-0 py-1.5 font-sans text-[11px] tracking-[0.15em] uppercase text-primary border-b border-primary/40 hover:border-primary transition-colors"
          >
            Ask us about it →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
