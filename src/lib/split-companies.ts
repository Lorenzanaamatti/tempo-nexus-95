/** Plataformas conocidas que suelen venir entre paréntesis junto a la productora. */
const PLATFORMS = ["netflix", "prime video", "amazon", "amazon mgm studios", "hbo", "max", "hbo max", "movistar", "movistar+", "disney", "disney+", "apple tv", "apple tv+", "filmin", "atresplayer", "rtve", "skyshowtime", "sky", "paramount+", "sony", "mubi"];

export type SplitCompanies = { companies: string[]; platforms: string[] };

function isPlatform(s: string) {
  const n = s.toLowerCase().replace(/\s+/g, " ").trim();
  return PLATFORMS.some((p) => n === p || n.startsWith(p + " ") || n.includes("(" + p));
}

/**
 * Separa un texto con varias productoras («A, B y C», «A / B + C») en nombres individuales.
 * El contenido entre paréntesis se descarta del nombre; si es una plataforma, se devuelve aparte.
 */
export function splitCompanyNames(raw: string | null | undefined): SplitCompanies {
  const companies: string[] = [];
  const platforms: string[] = [];
  if (!raw) return { companies, platforms };
  // Extraer paréntesis
  let text = raw.replace(/\(([^)]*)\)/g, (_m, inner: string) => {
    for (const part of inner.split(/[,/;]/)) {
      const p = part.trim();
      if (p && isPlatform(p)) platforms.push(p);
    }
    return " ";
  });
  text = text.replace(/\s+/g, " ");
  const parts = text.split(/\s*(?:,|;|\/|\+|&|\s+y\s+|\s+and\s+|\s+con\s+|\s+para\s+)\s*/i);
  for (const part of parts) {
    const name = part.trim()
      .replace(/^(?:con\s+)?(?:servicios\s+de|participación\s+de|animación|original|coprod\.?)\s+/i, "")
      .replace(/^[-–·:]+|[-–·.:]+$/g, "").trim();
    if (!name) continue;
    if (isPlatform(name)) { if (!platforms.includes(name)) platforms.push(name); continue; }
    if (!companies.some((c) => c.toLowerCase() === name.toLowerCase())) companies.push(name);
  }
  if (!companies.length && platforms.length) companies.push(platforms.shift()!);
  return { companies, platforms };
}
