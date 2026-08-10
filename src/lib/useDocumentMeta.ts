import { useEffect } from "react";

// Le site est une SPA à index.html unique : les balises <title>/<meta
// description>/<og:title>/<og:description>/<link rel=canonical>/<og:url>
// par défaut sont toutes celles de la homepage. Ce hook les remplace pendant
// qu'une page dédiée (ex. /kensington, /chelsea) est affichée, puis restaure
// les valeurs d'origine au démontage — pour qu'une navigation retour vers
// "/" ne garde pas le titre/canonical d'une autre page.
//
// ⚠️ Le canonical/og:url étaient auparavant IGNORÉS par ce hook : chaque
// page de la SPA pointait donc son URL canonique vers la homepage,
// signalant à Google que /kensington, /chelsea, /studios, etc. étaient des
// doublons de "/" plutôt que des pages à indexer séparément — l'inverse de
// l'effet recherché par ces pages SEO dédiées. Corrigé en dérivant le
// canonical de l'URL réelle (window.location, jamais un domaine en dur :
// une preview Vercel doit se canonicaliser elle-même, pas pointer vers la
// prod), sans la query string ni le hash.
export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const descTag = document.querySelector('meta[name="description"]');
    const previousDescription = descTag?.getAttribute("content") ?? null;
    descTag?.setAttribute("content", description);

    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    const previousOgTitle = ogTitleTag?.getAttribute("content") ?? null;
    ogTitleTag?.setAttribute("content", title);

    const ogDescTag = document.querySelector('meta[property="og:description"]');
    const previousOgDescription = ogDescTag?.getAttribute("content") ?? null;
    ogDescTag?.setAttribute("content", description);

    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

    const canonicalTag = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonicalTag?.getAttribute("href") ?? null;
    canonicalTag?.setAttribute("href", canonicalUrl);

    const ogUrlTag = document.querySelector('meta[property="og:url"]');
    const previousOgUrl = ogUrlTag?.getAttribute("content") ?? null;
    ogUrlTag?.setAttribute("content", canonicalUrl);

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null) descTag?.setAttribute("content", previousDescription);
      if (previousOgTitle !== null) ogTitleTag?.setAttribute("content", previousOgTitle);
      if (previousOgDescription !== null) ogDescTag?.setAttribute("content", previousOgDescription);
      if (previousCanonical !== null) canonicalTag?.setAttribute("href", previousCanonical);
      if (previousOgUrl !== null) ogUrlTag?.setAttribute("content", previousOgUrl);
    };
  }, [title, description]);
}
