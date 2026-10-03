import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { formatDateEs } from "@/lib/dates";

export const ACTIVITY_KIND_LABEL: Record<string, string> = {
  gestion: "Gestión",
  envio_material: "Envío de reel / dossier",
  reunion: "Reunión",
  llamada: "Llamada",
  pitch: "Pitch",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  produccion: "Producción",
  fase: "Fase de producción",
  prensa: "Prensa",
  contrato: "Contrato",
};

export type AgencyItem = {
  key: string;
  date: string;
  kind: string;
  title: string;
  detail?: string | null;
  counterpart?: string | null;
};

const db = supabase as any;

/** Junta todo lo que la agencia ha hecho por un representado, de todas las fuentes. */
export async function fetchAgencyTimeline(composerId: string, onlyVisible: boolean): Promise<AgencyItem[]> {
  let logQ = db.from("composer_activity_log").select("*").eq("composer_id", composerId);
  if (onlyVisible) logQ = logQ.eq("visible_to_artist", true);
  const [log, pitches, cands, prods, assigns, clips] = await Promise.all([
    logQ,
    db.from("oportunidades_pitch_composers")
      .select("pitch:oportunidades_pitches(id, titulo, estado, fecha_pitch, created_at, archivado_at, archivado_motivo, produccion_id, partner:partners!oportunidades_pitches_partner_destinatario_fkey(nombre))")
      .eq("composer_id", composerId),
    db.from("opportunity_candidates")
      .select("id, created_at, opportunity:opportunities(id, title, detected_date, partner_name)")
      .eq("composer_id", composerId),
    db.from("productions").select("id, title, created_at, start_date, status").eq("composer_id", composerId),
    db.from("production_assignments").select("production_id, start_date, created_at, role_in_project, production:productions(title)").eq("composer_id", composerId),
    db.from("press_clippings").select("*").eq("composer_id", composerId),
  ]);
  const items: AgencyItem[] = [];
  for (const r of log.data ?? [])
    items.push({ key: `l-${r.id}`, date: r.happened_on, kind: r.kind, title: r.title, detail: r.detail, counterpart: r.counterpart });
  // Si falla el join con partners, repetimos sin él.
  let pitchRows = pitches.data;
  if (pitches.error) {
    const retry = await db.from("oportunidades_pitch_composers")
      .select("pitch:oportunidades_pitches(id, titulo, estado, fecha_pitch, created_at, archivado_at, archivado_motivo, produccion_id)")
      .eq("composer_id", composerId);
    pitchRows = retry.data;
  }
  for (const r of pitchRows ?? []) {
    const p = r.pitch;
    if (!p) continue;
    items.push({
      key: `p-${p.id}`,
      date: p.fecha_pitch ?? p.created_at?.slice(0, 10),
      kind: "pitch",
      title: `Te hemos presentado para «${p.titulo}»`,
      detail: p.archivado_at ? (p.produccion_id ? "Conseguido: se convirtió en producción" : `Cerrado${p.archivado_motivo ? `: ${p.archivado_motivo}` : ""}`) : `Estado: ${p.estado ?? "en curso"}`,
      counterpart: p.partner?.nombre ?? null,
    });
  }
  for (const r of cands.data ?? []) {
    const o = r.opportunity;
    if (!o) continue;
    items.push({ key: `o-${r.id}`, date: r.created_at?.slice(0, 10) ?? o.detected_date, kind: "propuesta", title: `Propuesto como candidato en «${o.title}»`, counterpart: o.partner_name });
  }
  for (const p of prods.data ?? [])
    items.push({ key: `pr-${p.id}`, date: p.start_date ?? p.created_at?.slice(0, 10), kind: "produccion", title: `Producción conseguida: «${p.title}»` });
  for (const a of assigns.data ?? [])
    items.push({ key: `a-${a.production_id}-${a.created_at}`, date: a.start_date ?? a.created_at?.slice(0, 10), kind: "produccion", title: `Incorporado a «${a.production?.title ?? "producción"}»`, detail: a.role_in_project });
  for (const c of clips.data ?? [])
    items.push({ key: `c-${c.id}`, date: c.published_at ?? c.date ?? c.created_at?.slice(0, 10), kind: "prensa", title: c.title ?? c.headline ?? "Aparición en prensa", counterpart: c.media_name ?? c.outlet ?? null });
  return items.filter((i) => i.date).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function AgencyTimeline({ items }: { items: AgencyItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Todavía no hay gestiones registradas.</p>;
  let lastMonth = "";
  return (
    <ol className="space-y-1">
      {items.map((i) => {
        const month = new Date(i.date).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        const header = month !== lastMonth;
        lastMonth = month;
        return (
          <li key={i.key}>
            {header && <p className="mt-6 mb-2 smallcaps text-xs text-muted-foreground first:mt-0">{month}</p>}
            <div className="flex gap-4 border-l-2 border-primary/40 py-2 pl-4">
              <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{formatDateEs(i.date)}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ACTIVITY_KIND_LABEL[i.kind] ?? i.kind}
                  {i.counterpart ? ` · ${i.counterpart}` : ""}
                  {i.detail ? ` · ${i.detail}` : ""}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Edición interna: el equipo registra gestiones y decide si el artista las ve. */
export function ActivityLogEditor({ composerId }: { composerId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ kind: "envio_material", title: "", counterpart: "", happened_on: new Date().toISOString().slice(0, 10), visible: true });
  const logQ = useQuery({
    queryKey: ["activity-log", composerId],
    queryFn: async () => {
      const { data, error } = await db.from("composer_activity_log").select("*").eq("composer_id", composerId).order("happened_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const timelineQ = useQuery({ queryKey: ["agency-timeline", composerId, "all"], queryFn: () => fetchAgencyTimeline(composerId, false) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["activity-log", composerId] });
    qc.invalidateQueries({ queryKey: ["agency-timeline", composerId] });
  };

  async function add() {
    if (!form.title.trim()) return toast.error("Describe la gestión");
    const { error } = await db.from("composer_activity_log").insert({
      composer_id: composerId,
      kind: form.kind,
      title: form.title.trim(),
      counterpart: form.counterpart.trim() || null,
      happened_on: form.happened_on,
      visible_to_artist: form.visible,
    });
    if (error) return toast.error(error.message);
    toast.success("Gestión registrada");
    setForm({ ...form, title: "", counterpart: "" });
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-[180px_1fr_200px_150px_auto_auto]">
        <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["envio_material", "reunion", "llamada", "negociacion", "gestion", "prensa"].map((k) => (
              <SelectItem key={k} value={k}>{ACTIVITY_KIND_LABEL[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Qué se hizo (ej. Enviado reel a la directora)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Con quién (productora, persona)" value={form.counterpart} onChange={(e) => setForm({ ...form, counterpart: e.target.value })} />
        <Input type="date" value={form.happened_on} onChange={(e) => setForm({ ...form, happened_on: e.target.value })} />
        <Button type="button" variant="outline" size="icon" title={form.visible ? "Visible para el artista" : "Solo interno"} onClick={() => setForm({ ...form, visible: !form.visible })}>
          {form.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <Button type="button" onClick={add}>Añadir</Button>
      </div>

      {(logQ.data ?? []).length > 0 && (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {(logQ.data ?? []).map((r: any) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-24 font-mono text-xs text-muted-foreground">{formatDateEs(r.happened_on)}</span>
              <span className="flex-1">{r.title}{r.counterpart ? <span className="text-muted-foreground"> · {r.counterpart}</span> : null}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                title={r.visible_to_artist ? "Visible para el artista (clic para ocultar)" : "Solo interno (clic para mostrar)"}
                onClick={async () => { await db.from("composer_activity_log").update({ visible_to_artist: !r.visible_to_artist }).eq("id", r.id); refresh(); }}
              >
                {r.visible_to_artist ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                title="Eliminar"
                onClick={async () => { if (!confirm("¿Eliminar esta gestión?")) return; await db.from("composer_activity_log").delete().eq("id", r.id); refresh(); }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <p className="mb-2 smallcaps text-xs text-muted-foreground">Historial completo (así lo resume su portal)</p>
        {timelineQ.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : <AgencyTimeline items={timelineQ.data ?? []} />}
      </div>
    </div>
  );
}
