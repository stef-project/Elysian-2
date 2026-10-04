import { motion } from "framer-motion";

// Homepage = curated proof : extraits courts, exacts (jamais reformulés),
// coupés uniquement à des frontières de phrase qui ne changent pas le sens.
// Client Stories = full proof : la version intégrale de chaque témoignage
// reste publiée telle quelle sur sa page dédiée (lien discret ci-dessous
// quand une page existe) — rien n'est supprimé, seul l'extrait homepage
// change. Pour Post-Op et Maternal (catégories médicalement sensibles),
// les passages évoquant un délai post-opératoire ou une évaluation clinique
// (accord chirurgien/sage-femme, état de cicatrisation) sont volontairement
// exclus de l'extrait homepage pour ne pas ressembler à un avis médical,
// même si le témoignage complet (inchangé) les contient sur sa page source.
const categories = [
  {
    label: "Results",
    quotes: [
      { quote: "I had tried several treatments before, but with Elysian Paris the results were immediate. I felt lighter as soon as the session was over.", name: "Kim", detail: "London" },
      { quote: "My legs constantly felt heavy and swollen. After every session, I notice a real difference and feel so much more comfortable.", name: "Emma", detail: "Surrey" },
    ],
  },
  {
    label: "Expertise",
    quotes: [
      { quote: "She went through the whole health questionnaire with me before we started and actually turned down one of the areas I asked for. I've never had a clinic say no to me before.", name: "Haely", detail: "Cavitation" },
      { quote: "Realistic about what it can and can't do. She told me it wasn't a substitute for the gym.", name: "Mona", detail: "Cavitation" },
    ],
    fullStoryHref: "/cavitation-body-contouring-london",
    fullStoryLabel: "More Cavitation stories →",
  },
  {
    label: "Experience",
    quotes: [
      { quote: "Magic hands, truly. A treatment that makes all the difference.", name: "Grace", detail: "London" },
      { quote: "I have been coming regularly for over three years and simply couldn't be without it.", name: "Stella", detail: "London" },
    ],
  },
  {
    label: "Post-Op",
    quotes: [
      { quote: "I had a tummy tuck in March and I was terrified of doing something wrong afterwards. The swelling came down faster than I expected and I never once felt like I was being rushed.", name: "Lea", detail: "Post-Op" },
      { quote: "What I appreciated most was that she knew exactly what she couldn't do: no pressure on the area, nothing risky. I felt safe.", name: "Anna", detail: "Post-Op" },
    ],
    fullStoryHref: "/lymphatic-drainage-after-surgery",
    fullStoryLabel: "More Post-Op stories →",
  },
  {
    label: "Maternal",
    quotes: [
      { quote: "I had never had a massage during pregnancy before. It was excellent, and I've been recommending it to every mother I know.", name: "Charlotte", detail: "Chelsea" },
      { quote: "At 28 weeks I couldn't sleep. She set me up on my side with cushions and it was the first hour of proper rest I'd had in weeks.", name: "P.T.", detail: "Prenatal" },
    ],
    fullStoryHref: "/prenatal-postnatal-massage-london",
    fullStoryLabel: "More Maternal stories →",
  },
];

export function Quotes() {
  return (
    <section className="py-20 md:py-32 bg-[#1A1A1A]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-[#BF944A] mb-4">
            Client Stories
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-[#F7F5F2] font-light">
            Discover how our treatments<br />
            <span className="italic text-[#E2CAA2]">transform lives.</span>
          </h2>
        </motion.div>

        <div className="space-y-14">
          {categories.map((cat, ci) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: ci * 0.05 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="inline-block font-sans text-[10px] tracking-[0.18em] uppercase bg-[#BF944A] text-[#1A1A1A] px-3 py-1.5">
                  {cat.label}
                </span>
                {"fullStoryHref" in cat && cat.fullStoryHref && (
                  <a
                    href={cat.fullStoryHref}
                    className="font-sans text-[10px] tracking-[0.15em] uppercase text-[#F7F5F2]/40 hover:text-[#F7F5F2]/70 border-b border-[#F7F5F2]/20 hover:border-[#F7F5F2]/50 transition-colors"
                  >
                    {"fullStoryLabel" in cat ? cat.fullStoryLabel : "Full story →"}
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {cat.quotes.map((t) => (
                  <div key={t.name} className="border-l-2 border-[#F7F5F2]/15 pl-5">
                    <p className="font-serif text-lg text-[#F7F5F2]/90 font-light leading-snug mb-3">
                      "{t.quote}"
                    </p>
                    <p className="font-sans text-[11px] tracking-[0.1em] uppercase text-[#F7F5F2]/40">
                      {t.name} · {t.detail}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 grid grid-cols-3 gap-8 text-center border-t border-[#F7F5F2]/10 pt-14"
        >
          {[
            { value: "★★★★★", label: "On Google & ClassPass" },
            { value: "3 yrs+", label: "Of loyal clients" },
            { value: "1 of 1", label: "Method™ in the UK" },
          ].map((s, i) => (
            <div key={i}>
              <p className="font-serif text-3xl text-[#BF944A] mb-2">{s.value}</p>
              <p className="font-sans text-[11px] uppercase tracking-[0.15em] text-[#F7F5F2]/40">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
