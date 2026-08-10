/**
 * Format a date value as dd/mm/yyyy for UI display.
 * Accepts ISO strings (yyyy-mm-dd or full ISO), Date objects, or nullish.
 * Returns "—" for empty/invalid values so it can be used directly in JSX.
 */
export function formatDateEs(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") {
    // Fast path for plain yyyy-mm-dd strings (avoid TZ shifts).
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Fecha + hora para UI: "12/03/2026, 09:30". Único formateador de fecha-hora
 * de la app: no uses `toLocaleString` suelto en componentes.
 */
export function formatDateTimeEs(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

/** Fecha corta con hora: "12 mar, 09:30". Para listados compactos. */
export function formatShortDateTimeEs(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}