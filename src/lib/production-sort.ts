/**
 * Orden alfabético de títulos de producción, en español:
 * ignora mayúsculas y acentos, coloca la ñ tras la n y deja los títulos vacíos al final.
 */
const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

export type TitleSortable = {
  title: string | null | undefined;
  year?: number | null;
};

/** Comparador para Array#sort: A → Z por título; empate resuelto por año. */
export function byTitleEs(a: TitleSortable, b: TitleSortable): number {
  const t = (a.title ?? "").trim();
  const u = (b.title ?? "").trim();
  if (!t && !u) return 0;
  if (!t) return 1;
  if (!u) return -1;
  const cmp = collator.compare(t, u);
  if (cmp !== 0) return cmp;
  return (a.year ?? 0) - (b.year ?? 0);
}
