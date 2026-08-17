import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportRowsButton } from "@/components/export-rows-button";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { addProspectFichaje } from "@/lib/espanolas-actions";
import { addToRoster } from "@/lib/spanish-films-crm";
import { UserPlus, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/roster")({
  component: DeteccionTalento,
});

const db = supabase as any;
const ALL = "__all__";

const ROLES = [
  { key: "composer", label: "Compositor BSO" },
  { key: "music_supervisor", label: "Supervisión musical" },
  { key: "mezclador", label: "Mezclador" },
  { key: "orquestador", label: "Orquestador" },
  { key: "director_orquesta", label: "Director de orquesta" },
] as const;

type RoleKey = (typeof ROLES)[number]["key"];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

type Detected = {
  nombre: string;
  roles: RoleKey[];
  titulos: number;
  primerAno: number | null;
  ultimoAno: number | null;
  ultimas: string[];
  productoras: string[];
  plataformas: string[];
  enRoster: boolean;
  enProspects: boolean;
};

function useDeteccion() {
  return useQuery({
    queryKey: ["deteccion-talento"],
    queryFn: async () => {
      const rows: any[] = [];
      const size = 1000;
      for (let from = 0; from < 40_000; from += size) {
        const { data, error } = await db
          .from("producciones_espanolas")
          .select(
            "title, title_es, year, platform, production_companies, composer, music_supervisor, mezclador, orquestador, director_orquesta",
          )
          .order("year", { ascending: false, nullsFirst: false })
          .range(from, from + size - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < size) break;
      }
      const [composers, prospects] = await Promise.all([
        supabase.from("composers").select("full_name, artistic_name"),
        db.from("roster_prospects").select("nombre"),
      ]);
      const rosterSet = new Set<string>();
      for (const c of (composers.data ?? []) as any[]) {
        if (c.full_name) rosterSet.add(norm(c.full_name));
        if (c.artistic_name) rosterSet.add(norm(c.artistic_name));
      }
      const prospectSet = new Set<string>(
        ((prospects.data ?? []) as any[]).map((p) => norm(p.nombre ?? "")),
      );

      const map = new Map<string, Detected>();
      for (const r of rows) {
        const titulo = r.title_es ?? r.title ?? "";
        for (const { key } of ROLES) {
          const raw = (r as any)[key] as string | null;
          if (!raw || !raw.trim()) continue;
          for (const part of raw.split(/\s*[,/;|]\s*|\s+y\s+/)) {
            const nombre = part.trim();
            if (nombre.length < 3) continue;
            const k = norm(nombre);
            let d = map.get(k);
            if (!d) {
              d = {
                nombre,
                roles: [],
                titulos: 0,
                primerAno: null,
                ultimoAno: null,
                ultimas: [],
                productoras: [],
                plataformas: [],
                enRoster: rosterSet.has(k),
                enProspects: prospectSet.has(k),
              };
              map.set(k, d);
            }
            if (!d.roles.includes(key)) d.roles.push(key);
            d.titulos += 1;
            if (typeof r.year === "number") {
              d.primerAno = d.primerAno == null ? r.year : Math.min(d.primerAno, r.year);
              d.ultimoAno = d.ultimoAno == null ? r.year : Math.max(d.ultimoAno, r.year);
            }
            if (titulo && d.ultimas.length < 6 && !d.ultimas.includes(titulo)) d.ultimas.push(titulo);
            for (const p of (r.production_companies ?? []) as string[]) {
              if (p && !d.productoras.includes(p) && d.productoras.length < 6) d.productoras.push(p);
            }
            if (r.platform && !d.plataformas.includes(r.platform)) d.plataformas.push(r.platform);
          }
        }
      }
      return [...map.values()].sort(
        (a, b) => b.titulos - a.titulos || (b.ultimoAno ?? 0) - (a.ultimoAno ?? 0),
      );
    },
  });
}

function DeteccionTalento() {
  const qc = useQueryClient();
  const { data, isLoading } = useDeteccion();
  const [rol, setRol] = useState<string>(ALL);
  const [q, setQ] = useState("");
  const [minTitulos, setMinTitulos] = useState("2");
  const [desde, setDesde] = useState("2020");
  const [soloNuevos, setSoloNuevos] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const min = Number(minTitulos) || 1;
    const y = Number(desde) || 0;
    const nq = norm(q);
    return (data ?? []).filter((d) => {
      if (rol !== ALL && !d.roles.includes(rol as RoleKey)) return false;
      if (d.titulos < min) return false;
      if (y && (d.ultimoAno ?? 0) < y) return false;
      if (soloNuevos && (d.enRoster || d.enProspects)) return false;
      if (nq && !norm(d.nombre).includes(nq)) return false;
      return true;
    });
  }, [data, rol, q, minTitulos, desde, soloNuevos]);

  const exportRows = filtered.map((d) => ({
    nombre: d.nombre,
    roles: d.roles.map((r) => ROLES.find((x) => x.key === r)?.label ?? r),
    titulos: d.titulos,
    periodo: d.primerAno && d.ultimoAno ? `${d.primerAno}–${d.ultimoAno}` : "",
    productoras: d.productoras,
    plataformas: d.plataformas,
    estado: d.enRoster ? "En roster" : d.enProspects ? "En prospects" : "Nuevo",
  }));

  const fichar = async (d: Detected) => {
    setBusy(d.nombre);
    const rolLabel = ROLES.find((x) => x.key === d.roles[0])?.label ?? null;
    await addProspectFichaje(
      d.nombre,
      `Detectado en ${d.titulos} producción(es) española(s): ${d.ultimas.join(", ")}`,
      rolLabel,
    );
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["deteccion-talento"] });
    qc.invalidateQueries({ queryKey: ["roster-prospects"] });
  };

  const alRoster = async (d: Detected) => {
    setBusy(d.nombre);
    await addToRoster(d.nombre, d.roles.includes("music_supervisor") ? "supervisor" : "composer");
    setBusy(null);
    qc.invalidateQueries({ queryKey: ["deteccion-talento"] });
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Oportunidades de ventas · Roster</p>
          <h1 className="mt-1 font-display text-5xl title-caps">DETECCIÓN DE TALENTO</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Radar de profesionales musicales detectados en el CRM de producciones españolas:
            compositores, supervisores, mezcladores, orquestadores y directores de orquesta que
            todavía no están en el roster. Ordenados por número de producciones.
          </p>
        </div>
        <ExportRowsButton rows={exportRows} filename="deteccion-talento" sheetName="Detección" />
      </div>

      <div className="mb-6 grid gap-2 rounded-sm border border-border bg-card/40 p-4 md:grid-cols-[1.4fr_1.6fr_.8fr_.8fr_auto]">
        <Select value={rol} onValueChange={setRol}>
          <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Buscar nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input
          type="number" min={1} placeholder="Mín. títulos"
          value={minTitulos} onChange={(e) => setMinTitulos(e.target.value)}
        />
        <Input
          type="number" placeholder="Activo desde"
          value={desde} onChange={(e) => setDesde(e.target.value)}
        />
        <Button
          type="button"
          variant={soloNuevos ? "default" : "outline"}
          onClick={() => setSoloNuevos((v) => !v)}
        >
          Solo no fichados
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="Sin resultados"
          description="Ajusta los filtros o importa más producciones españolas para alimentar el radar."
        />
      ) : (
        <>
          <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
            {filtered.length} perfiles detectados
          </p>
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Roles</th>
                  <th className="px-3 py-2 text-right">Títulos</th>
                  <th className="px-3 py-2 text-left">Periodo</th>
                  <th className="px-3 py-2 text-left">Últimas producciones</th>
                  <th className="px-3 py-2 text-left">Productoras / plataformas</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.nombre} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-medium">
                      {d.nombre}
                      {d.enRoster && <Badge className="ml-2" variant="secondary">En roster</Badge>}
                      {!d.enRoster && d.enProspects && (
                        <Badge className="ml-2" variant="outline">En prospects</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {d.roles.map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px]">
                            {ROLES.find((x) => x.key === r)?.label}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className={cn("px-3 py-2 text-right tabular-nums", d.titulos >= 5 && "font-bold text-primary")}>
                      {d.titulos}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {d.primerAno && d.ultimoAno ? `${d.primerAno}–${d.ultimoAno}` : "—"}
                    </td>
                    <td className="max-w-[22rem] px-3 py-2 text-muted-foreground">
                      {d.ultimas.join(" · ") || "—"}
                    </td>
                    <td className="max-w-[18rem] px-3 py-2 text-xs text-muted-foreground">
                      {[...d.productoras, ...d.plataformas].join(" · ") || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Button
                        size="sm" variant="outline" disabled={busy === d.nombre || d.enProspects}
                        onClick={() => fichar(d)}
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" /> Prospect
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="ml-1"
                        disabled={busy === d.nombre || d.enRoster}
                        onClick={() => alRoster(d)}
                      >
                        Ficha roster
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
