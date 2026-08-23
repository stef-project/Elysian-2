// Section témoignages réutilisable pour les pages dédiées (post-op, prénatal/
// postnatal, cavitation) — thème clair, pour s'insérer dans l'alternance de
// fonds déjà en place sur ces pages (contrairement à Quotes.tsx, section
// sombre de la page d'accueil, structurellement différente).

export type Testimonial = {
  quote: string;
  name: string;
  detail?: string;
};

export function TestimonialSection({
  eyebrow,
  heading,
  testimonials,
  background = "bg-background",
}: {
  eyebrow: string;
  heading: string;
  testimonials: Testimonial[];
  background?: string;
}) {
  return (
    <section className={`py-24 ${background}`}>
      <div className="max-w-3xl mx-auto px-6">
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4 text-center">
          {eyebrow}
        </p>
        <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-14 text-center">
          {heading}
        </h2>
        <div className="space-y-10">
          {testimonials.map((t) => (
            <div key={t.name} className="border-l-2 border-[#BF944A] pl-6">
              <p className="font-serif text-xl text-[#1A1A1A] font-light leading-relaxed mb-4">
                "{t.quote}"
              </p>
              <p className="font-sans text-xs tracking-[0.15em] uppercase text-muted-foreground">
                {t.name}
                {t.detail ? ` · ${t.detail}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
