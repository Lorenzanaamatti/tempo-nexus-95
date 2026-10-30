// Agrupación manual de miles: algunos navegadores no agrupan cifras de 4 dígitos
// (3.160) aunque se pida useGrouping: "always", así que insertamos el punto a mano.
function groupEs(intPart: string): string {
  const sign = intPart.startsWith("-") ? "-" : "";
  const digits = sign ? intPart.slice(1) : intPart;
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function decimalsEs(n: number, digits: number): string {
  const fixed = Math.abs(n).toFixed(digits);
  const [intPart, decPart] = fixed.split(".");
  return `${n < 0 ? "-" : ""}${groupEs(intPart)}${digits > 0 ? `,${decPart}` : ""}`;
}

const EUR = { format: (n: number) => `${decimalsEs(n, 2)} €` };
const NUM = { format: (n: number) => decimalsEs(n, 2) };
// Todas las cifras: separador de miles siempre (también en 4 cifras: 3.000,00) y dos decimales.
const EUR0 = EUR;

export function formatEUR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return EUR.format(n);
}

/** Importe en euros para KPIs y totales (con dos decimales, como el resto de cifras). */
export function formatEUR0(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return EUR.format(0);
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return EUR.format(0);
  return EUR0.format(n);
}

/**
 * Importe con moneda arbitraria (EUR/USD/otras). Único formateador de dinero
 * multi-divisa de la app: no dupliques esta lógica en otros archivos.
 */
export function formatMoneyEs(
  amount: number | string | null | undefined,
  moneda = "EUR",
  options?: { emptyLabel?: string; alwaysDecimals?: boolean },
): string {
  const emptyLabel = options?.emptyLabel ?? "—";
  if (amount === null || amount === undefined || amount === "") return emptyLabel;
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return emptyLabel;
  const symbol = moneda === "EUR" ? "€" : moneda === "USD" ? "$" : moneda;
  const withDecimals = true;
  return `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: 2,
    useGrouping: "always" as any,
  }).format(n)} ${symbol}`;
}

const INT = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" as any });

/** Número entero con separador de miles: "1.234". Para contadores y KPIs de unidades. */
export function formatIntEs(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return INT.format(Math.round(n));
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