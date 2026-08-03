import { useEffect } from "react";
import { useDocumentMeta } from "../lib/useDocumentMeta";

export default function NotFound() {
  useDocumentMeta(
    "Page Not Found | Elysian Paris",
    "The page you are looking for may have moved or no longer exists."
  );

  // Une URL invalide ne doit jamais s'indexer sous le titre/description de la homepage.
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]');
    const previous = tag?.getAttribute("content") ?? null;
    tag?.setAttribute("content", "noindex, nofollow");
    return () => {
      if (previous !== null) tag?.setAttribute("content", previous);
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground font-sans px-6">
      <div className="text-center max-w-md">
        <div className="w-8 h-[1px] bg-primary mx-auto mb-8" />
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-primary mb-4">
          Page not found
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light mb-5">
          We couldn&rsquo;t find that page
        </h1>
        <p className="font-sans text-sm text-muted-foreground font-light leading-relaxed mb-10">
          The page you are looking for may have moved or no longer exists.
          Let us guide you back.
        </p>
        <a
          href="/"
          className="inline-block font-sans text-xs tracking-[0.2em] uppercase bg-[#1A1A1A] text-[#F7F5F2] px-12 py-4 hover:bg-primary transition-colors duration-300"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}
