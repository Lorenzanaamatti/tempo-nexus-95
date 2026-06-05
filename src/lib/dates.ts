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