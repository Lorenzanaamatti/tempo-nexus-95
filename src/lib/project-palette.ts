export const PROJECT_PALETTE = Array.from({ length: 25 }, (_, i) => `p${i + 1}`);
export type ProjectColorKey = string;

export function projectColorVar(key: string | null | undefined): string {
  const n = key && /^p([1-9]|1\d|2[0-5])$/.test(key) ? key.slice(1) : null;
  return n ? `var(--proj-${n})` : "var(--proj-21)";
}

/** Color estable derivado del id cuando la producción no tiene color elegido. */
export function fallbackProjectColor(id: string): ProjectColorKey {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PROJECT_PALETTE[h % PROJECT_PALETTE.length];
}
