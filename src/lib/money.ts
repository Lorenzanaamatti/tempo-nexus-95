const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEUR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return EUR.format(n);
}

export function formatNumberEs(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return NUM.format(n);
}

/**
 * Parse a user-typed amount robustly. Accepts:
 *  - es-ES: "1.234,56", "1234,5", "1.234"
 *  - en-US: "1,234.56", "1234.56"
 *  - plain: "1234", "1234.5", "-1234,56"
 *  - with currency symbol or spaces: "1.234,56 €"
 *
 * Rule: when both "." and "," appear, the LAST one is the decimal separator
 * and the other is treated as thousands. When only one appears multiple
 * times, or once with exactly 3 digits after it and no other clue, it's
 * treated as a thousands separator.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  if (!s) return null;
  // Strip everything that's not digit, separator, or sign
  s = s.replace(/[^\d.,\-]/g, "");
  if (!s) return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  let normalized: string;
  if (hasDot && hasComma) {
    // Last separator is decimal, the other is thousands
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastDot) {
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only commas → es-ES decimal, or thousands if multiple / 3-digit groups
    const parts = s.split(",");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length > 0)) {
      normalized = s.replace(/,/g, "");
    } else {
      normalized = s.replace(",", ".");
    }
  } else if (hasDot) {
    // Only dots → en-US decimal, or thousands if multiple / 3-digit groups
    const parts = s.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length > 0)) {
      normalized = s.replace(/\./g, "");
    } else {
      normalized = s;
    }
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  // Clamp to 2 decimals to avoid floating-point noise
  return Math.round(n * 100) / 100;
}