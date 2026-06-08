import { useMemo } from "react";
import { Input } from "@/components/ui/input";

const ES_PROVINCES = [
  "A Coruña","Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Baleares","Barcelona",
  "Bizkaia","Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ceuta","Ciudad Real","Córdoba","Cuenca",
  "Girona","Gipuzkoa","Granada","Guadalajara","Huelva","Huesca","Jaén","La Rioja","Las Palmas","León",
  "Lleida","Lugo","Madrid","Málaga","Melilla","Murcia","Navarra","Ourense","Palencia","Pontevedra",
  "Salamanca","Santa Cruz de Tenerife","Segovia","Sevilla","Soria","Tarragona","Teruel","Toledo",
  "Valencia","Valladolid","Zamora","Zaragoza",
] as const;

const REGIONS = ["EUROPA", "USA", "WORLD"] as const;
type Region = (typeof REGIONS)[number];

function parse(value: string | null | undefined): { kind: "es" | Region | ""; detail: string } {
  if (!value) return { kind: "", detail: "" };
  for (const r of REGIONS) {
    const prefix = `${r}: `;
    if (value.startsWith(prefix)) return { kind: r, detail: value.slice(prefix.length) };
  }
  if ((ES_PROVINCES as readonly string[]).includes(value)) return { kind: "es", detail: value };
  // fallback: treat as ES free text
  return { kind: "es", detail: value };
}

function serialize(kind: "es" | Region | "", detail: string): string | null {
  if (!kind) return null;
  const d = detail.trim();
  if (!d) return null;
  if (kind === "es") return d;
  return `${kind}: ${d}`;
}

export function CurrentLocationEditor({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
}) {
  const parsed = useMemo(() => parse(value), [value]);

  function setKind(kind: "es" | Region | "") {
    if (!kind) return onChange(null);
    if (kind === "es") return onChange(null); // wait for province pick
    onChange(null); // wait for detail input
    // store kind in parsed via re-render: use detail empty
    queueMicrotask(() => onChange(serialize(kind, "")));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="h-9 rounded-sm border border-input bg-background px-2 text-sm"
        value={parsed.kind || ""}
        onChange={(e) => setKind(e.target.value as "es" | Region | "")}
      >
        <option value="">Ubicación actual…</option>
        <optgroup label="España (provincia)">
          <option value="es">— Elegir provincia —</option>
        </optgroup>
        <optgroup label="Otras zonas">
          <option value="EUROPA">Europa</option>
          <option value="USA">USA</option>
          <option value="WORLD">World</option>
        </optgroup>
      </select>

      {parsed.kind === "es" && (
        <select
          className="h-9 rounded-sm border border-input bg-background px-2 text-sm"
          value={(ES_PROVINCES as readonly string[]).includes(parsed.detail) ? parsed.detail : ""}
          onChange={(e) => onChange(serialize("es", e.target.value))}
        >
          <option value="">— Provincia —</option>
          {ES_PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {(parsed.kind === "EUROPA" || parsed.kind === "USA" || parsed.kind === "WORLD") && (
        <Input
          className="h-9 w-56"
          placeholder={
            parsed.kind === "EUROPA" ? "Ej. Francia, París…"
            : parsed.kind === "USA" ? "Ej. Chicago, NY…"
            : "Ej. Rusia, Tokio…"
          }
          value={parsed.detail}
          onChange={(e) => onChange(serialize(parsed.kind as Region, e.target.value))}
        />
      )}
    </div>
  );
}