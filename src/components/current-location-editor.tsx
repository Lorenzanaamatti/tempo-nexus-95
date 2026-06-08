import { useEffect, useState } from "react";
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

type Kind = "" | "es" | Region;

function parse(value: string | null | undefined): { kind: Kind; detail: string } {
  if (!value) return { kind: "", detail: "" };
  for (const r of REGIONS) {
    if (value === r) return { kind: r, detail: "" };
    const prefix = `${r}: `;
    if (value.startsWith(prefix)) return { kind: r, detail: value.slice(prefix.length) };
  }
  if ((ES_PROVINCES as readonly string[]).includes(value)) return { kind: "es", detail: value };
  return { kind: "es", detail: value };
}

function serialize(kind: Kind, detail: string): string | null {
  if (!kind) return null;
  const d = detail.trim();
  if (kind === "es") return d ? d : null;
  return d ? `${kind}: ${d}` : kind; // keep region selection even without detail
}

export function CurrentLocationEditor({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
}) {
  const initial = parse(value);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [detail, setDetail] = useState<string>(initial.detail);

  // Sync from prop when it changes externally.
  useEffect(() => {
    const p = parse(value);
    setKind(p.kind);
    setDetail(p.detail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function changeKind(next: Kind) {
    setKind(next);
    setDetail("");
    onChange(serialize(next, ""));
  }
  function changeDetail(next: string) {
    setDetail(next);
    onChange(serialize(kind, next));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="h-9 rounded-sm border border-input bg-background px-2 text-sm"
        value={kind || ""}
        onChange={(e) => changeKind(e.target.value as Kind)}
      >
        <option value="">Ubicación actual…</option>
        <option value="es">España (provincia)</option>
        <option value="EUROPA">Europa</option>
        <option value="USA">USA</option>
        <option value="WORLD">World</option>
      </select>

      {kind === "es" && (
        <select
          className="h-9 rounded-sm border border-input bg-background px-2 text-sm"
          value={(ES_PROVINCES as readonly string[]).includes(detail) ? detail : ""}
          onChange={(e) => changeDetail(e.target.value)}
        >
          <option value="">— Provincia —</option>
          {ES_PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {(kind === "EUROPA" || kind === "USA" || kind === "WORLD") && (
        <Input
          className="h-9 w-56"
          placeholder={
            kind === "EUROPA" ? "Ej. Francia, París…"
            : kind === "USA" ? "Ej. Chicago, NY…"
            : "Ej. Rusia, Tokio…"
          }
          value={detail}
          onChange={(e) => changeDetail(e.target.value)}
        />
      )}
    </div>
  );
}