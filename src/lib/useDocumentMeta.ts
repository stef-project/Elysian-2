import { useEffect } from "react";

// Le site est une SPA à index.html unique : les balises <title>/<meta
// description>/<og:title>/<og:description> par défaut sont celles de la
// homepage. Ce hook les remplace pendant qu'une page dédiée (ex. /kensington,
// /chelsea) est affichée, puis restaure les valeurs d'origine au démontage —
// pour qu'une navigation retour vers "/" ne garde pas le titre d'une autre page.
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

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null) descTag?.setAttribute("content", previousDescription);
      if (previousOgTitle !== null) ogTitleTag?.setAttribute("content", previousOgTitle);
      if (previousOgDescription !== null) ogDescTag?.setAttribute("content", previousOgDescription);
    };
  }, [title, description]);
}
