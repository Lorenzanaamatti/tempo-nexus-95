import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type Project = {
  id: string;
  composer_id: string;
  production: string;
  production_type: string | null;
  music_type: string | null;
  production_company: string | null;
  director: string | null;
  platform: string | null;
  year: number | null;
  price_charged: number | null;
  production_cost: number | null;
  net_margin: number | null;
  agency_commission: number | null;
  composer_profit: number | null;
  notes: string | null;
  position: number;
};

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function sum(rows: Project[], key: keyof Project) {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

export function ProjectsHistoryEditor({ composerId }: { composerId: string }) {
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase
      .from("composer_projects")
      .select("*")
      .eq("composer_id", composerId)
      .order("year", { ascending: false, nullsFirst: false })
      .order("position", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Project[]);
  }

  useEffect(() => { void reload(); }, [composerId]);

  async function add() {
    setCreating(true);
    const { error } = await supabase.from("composer_projects").insert({
      composer_id: composerId,
      production: "Nuevo proyecto",
      year: new Date().getFullYear(),
      position: rows.length,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    await reload();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este proyecto del histórico?")) return;
    const { error } = await supabase.from("composer_projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const totals = {
    price_charged: sum(rows, "price_charged"),
    production_cost: sum(rows, "production_cost"),
    net_margin: sum(rows, "net_margin"),
    agency_commission: sum(rows, "agency_commission"),
    composer_profit: sum(rows, "composer_profit"),
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando histórico…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin proyectos registrados. Añade el primero para empezar el histórico económico.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <ProjectRow key={p.id} project={p} onRemove={() => remove(p.id)} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-sm border border-border bg-muted/40 p-4">
          <p className="mb-2 smallcaps text-muted-foreground">Totales acumulados</p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <Total label="Cobrado" value={totals.price_charged} />
            <Total label="Invertido" value={totals.production_cost} />
            <Total label="Margen neto" value={totals.net_margin} />
            <Total label="Comisión agencia" value={totals.agency_commission} />
            <Total label="Beneficios compositor" value={totals.composer_profit} accent />
          </div>
        </div>
      )}

      <Button size="sm" variant="outline" onClick={add} disabled={creating}>
        <Plus className="mr-1 h-3 w-3" /> {creating ? "Añadiendo…" : "Añadir proyecto"}
      </Button>
    </div>
  );
}

function Total({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-lg ${accent ? "text-primary" : ""}`}>{EUR.format(value)}</p>
    </div>
  );
}

function ProjectRow({ project, onRemove }: { project: Project; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [p, setP] = useState<Project>(project);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setP(project); }, [project]);

  const dirty = JSON.stringify(p) !== JSON.stringify(project);

  function set<K extends keyof Project>(k: K, v: Project[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }
  function setNum<K extends keyof Project>(k: K, v: string) {
    set(k, (v === "" ? null : Number(v)) as Project[K]);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("composer_projects")
      .update({
        production: p.production,
        production_type: p.production_type,
        music_type: p.music_type,
        production_company: p.production_company,
        director: p.director,
        platform: p.platform,
        year: p.year,
        price_charged: p.price_charged,
        production_cost: p.production_cost,
        net_margin: p.net_margin,
        agency_commission: p.agency_commission,
        composer_profit: p.composer_profit,
        notes: p.notes,
      })
      .eq("id", p.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Proyecto guardado");
  }

  return (
    <div className="rounded-sm border border-border">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Expandir"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="truncate font-display text-base">{p.production || "—"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {[p.year, p.production_type, p.production_company, p.platform].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cobrado</p>
          <p className="font-display text-sm">{EUR.format(Number(p.price_charged) || 0)}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Eliminar">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Producción">
              <Input value={p.production} onChange={(e) => set("production", e.target.value)} />
            </Field>
            <Field label="Año">
              <Input type="number" value={p.year ?? ""} onChange={(e) => setNum("year", e.target.value)} />
            </Field>
            <Field label="Tipo de producción">
              <Input
                value={p.production_type ?? ""}
                onChange={(e) => set("production_type", e.target.value || null)}
                placeholder="Largometraje, serie, doc, spot…"
              />
            </Field>
            <Field label="Tipo de música">
              <Input
                value={p.music_type ?? ""}
                onChange={(e) => set("music_type", e.target.value || null)}
                placeholder="Orquestal, electrónica, híbrida…"
              />
            </Field>
            <Field label="Productora">
              <Input
                value={p.production_company ?? ""}
                onChange={(e) => set("production_company", e.target.value || null)}
              />
            </Field>
            <Field label="Dirección">
              <Input value={p.director ?? ""} onChange={(e) => set("director", e.target.value || null)} />
            </Field>
            <Field label="Plataforma">
              <Input
                value={p.platform ?? ""}
                onChange={(e) => set("platform", e.target.value || null)}
                placeholder="Netflix, cines, RTVE…"
              />
            </Field>
          </div>

          <div className="rounded-sm border border-border bg-muted/30 p-3">
            <p className="mb-2 smallcaps text-muted-foreground">Economía del proyecto (€)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Precio cobrado">
                <Input type="number" step="0.01" value={p.price_charged ?? ""} onChange={(e) => setNum("price_charged", e.target.value)} />
              </Field>
              <Field label="Invertido en producción">
                <Input type="number" step="0.01" value={p.production_cost ?? ""} onChange={(e) => setNum("production_cost", e.target.value)} />
              </Field>
              <Field label="Margen neto">
                <Input type="number" step="0.01" value={p.net_margin ?? ""} onChange={(e) => setNum("net_margin", e.target.value)} />
              </Field>
              <Field label="Comisión agencia">
                <Input type="number" step="0.01" value={p.agency_commission ?? ""} onChange={(e) => setNum("agency_commission", e.target.value)} />
              </Field>
              <Field label="Beneficios compositor">
                <Input type="number" step="0.01" value={p.composer_profit ?? ""} onChange={(e) => setNum("composer_profit", e.target.value)} />
              </Field>
            </div>
          </div>

          <Field label="Notas">
            <Textarea rows={2} value={p.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
          </Field>

          <div className="flex justify-end">
            <SaveButton size="sm" onClick={save} saving={saving} disabled={!dirty} title={dirty ? "Guardar proyecto" : "Guardado"} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}