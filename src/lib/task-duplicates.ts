/** Detección de tareas duplicadas por contexto (título, cliente, producción, fecha). */
export type DupTask = {
  id: string;
  title: string;
  client?: string | null;
  production_id?: string | null;
  due_date?: string | null;
  done?: boolean;
};

const STOP = new Set(["de", "la", "el", "los", "las", "y", "a", "en", "con", "para", "por", "del", "al", "un", "una", "que", "e", "o"]);

export function normalizeText(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalizeText(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w)));
}

export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

function daysBetween(a: string, b: string) {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86400000);
}

/** Devuelve puntuación 0..1; >= 0.6 se considera posible duplicado. */
export function duplicateScore(a: DupTask, b: DupTask): number {
  const sim = titleSimilarity(a.title, b.title);
  if (normalizeText(a.title) === normalizeText(b.title) && normalizeText(a.title)) return 1;
  const ca = normalizeText(a.client), cb = normalizeText(b.client);
  if (ca && cb && ca !== cb) return sim >= 0.9 ? sim * 0.7 : 0; // clientes distintos: casi nunca duplicado
  if (a.production_id && b.production_id && a.production_id !== b.production_id) return 0;
  let score = sim;
  if (ca && ca === cb) score += 0.15;
  if (a.production_id && a.production_id === b.production_id) score += 0.15;
  if (a.due_date && b.due_date && daysBetween(a.due_date, b.due_date) <= 7) score += 0.1;
  return Math.min(1, score);
}

export const DUP_THRESHOLD = 0.6;

export function findDuplicatePairs(tasks: DupTask[], ignored: Set<string> = new Set()) {
  const pairs: Array<{ a: DupTask; b: DupTask; score: number }> = [];
  const open = tasks.filter((t) => !t.done);
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const key = pairKey(open[i].id, open[j].id);
      if (ignored.has(key)) continue;
      const score = duplicateScore(open[i], open[j]);
      if (score >= DUP_THRESHOLD) pairs.push({ a: open[i], b: open[j], score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}

export function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
