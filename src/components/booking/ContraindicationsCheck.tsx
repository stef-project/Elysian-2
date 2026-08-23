import { ALL_TREATMENTS_NOTICE, CONTRAINDICATIONS, type ContraindicationBlock } from "../../lib/contraindications";

// Affiché avant toute réservation (page /health-check pour les liens Google
// Calendar externes, en ligne sur /book-chelsea et /use-package) — même
// composant partout pour ne jamais faire dériver le contenu d'un parcours à
// l'autre. Contrôlé (checked/onCheckedChange) : chaque page gère elle-même
// où bloquer le bouton "continuer" tant que la case n'est pas cochée.

function Block({ block }: { block: ContraindicationBlock }) {
  return (
    <div className="border border-[#D4C9BD] bg-[#FAFAF9] p-6">
      <h3 className="font-serif text-lg text-[#1A1A1A] mb-4">{block.title}</h3>

      {block.doNotBookIf.length > 0 && (
        <div className="mb-4">
          <p className="font-sans text-[11px] tracking-[0.15em] uppercase text-red-700 mb-2">
            Do not book if you have
          </p>
          <ul className="space-y-1.5">
            {block.doNotBookIf.map((item) => (
              <li key={item} className="flex gap-2 font-sans text-sm text-[#1A1A1A]">
                <span className="text-red-700 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {block.speakToUsFirst.length > 0 && (
        <div className="mb-4">
          <p className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#BF944A] mb-2">
            Speak to us first
          </p>
          <ul className="space-y-1.5">
            {block.speakToUsFirst.map((item) => (
              <li key={item} className="flex gap-2 font-sans text-sm text-[#1A1A1A]">
                <span className="text-[#BF944A] flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {block.notes && block.notes.length > 0 && (
        <div className="pt-3 border-t border-border/60 space-y-1.5">
          {block.notes.map((note) => (
            <p key={note} className="font-sans text-xs text-muted-foreground font-light leading-relaxed">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContraindicationsCheck({
  treatmentKey,
  checked,
  onCheckedChange,
}: {
  treatmentKey: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const blocks = CONTRAINDICATIONS[treatmentKey] ?? [];

  return (
    <div className="space-y-4">
      <div className="border border-[#D4C9BD] bg-[#F0EBE1] p-6">
        <p className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#1A1A1A] mb-2">
          Before you book
        </p>
        <p className="font-sans text-sm text-[#1A1A1A] leading-relaxed">{ALL_TREATMENTS_NOTICE}</p>
      </div>

      {blocks.map((block) => (
        <Block key={block.title} block={block} />
      ))}

      <label className="flex items-start gap-3 border border-[#D4C9BD] bg-[#FAFAF9] p-5 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 flex-shrink-0"
        />
        <span className="font-sans text-sm text-[#1A1A1A] leading-relaxed">
          I confirm none of the "Do not book" conditions above apply to me. If anything under
          "Speak to us first" applies, I will message Elysian Paris directly instead of booking
          online.
        </span>
      </label>
    </div>
  );
}
