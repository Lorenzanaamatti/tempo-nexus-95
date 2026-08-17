/** Utilidades de área geográfica compartidas por las vistas de roster. */

export function formatLocation(...parts: (string | null | undefined)[]) {
  const clean = parts.map((p) => (p ?? "").trim()).filter(Boolean);
  return [...new Set(clean)].join(" · ");
}

/** Coincidencia laxa (sin acentos ni mayúsculas) contra cualquiera de los campos. */
export function matchesLocation(term: string, ...parts: (string | null | undefined)[]) {
  const needle = normalize(term);
  if (!needle) return true;
  return parts.some((p) => normalize(p).includes(needle));
}

export function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
