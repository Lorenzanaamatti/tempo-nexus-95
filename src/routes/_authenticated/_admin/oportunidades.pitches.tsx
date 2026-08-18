import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ExportRowsButton } from "@/components/export-rows-button";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateEs } from "@/lib/dates";
import { PITCH_ESTADOS, PITCH_ESTADO_CLASS, PITCH_TIPOS } from "@/lib/pitches";

const db = supabase as any;

export type PitchRow = Record<string, any>;

export function usePitches() {
  return useQuery({
    queryKey: ["pitches", "list"],
    queryFn: async () => {
      const [{ data: pitches, error }, { data: links }] = await Promise.all([
        db
          .from("oportunidades_pitches")
          .select("*, partner:partners(id, nombre), responsable:people(id, full_name)")
          .order("fecha_seguimiento", { ascending: true, nullsFirst: false })
          .order("fecha_pitch", { ascending: false, nullsFirst: false }),
        db.from("oportunidades_pitch_composers").select("pitch_id, composer:composers(id, full_name)"),
      ]);
      if (error) throw error;
      const byPitch = new Map<string, { id: string; full_name: string }[]>();
      for (const l of links ?? []) {
        if (!l.composer) continue;
        const arr = byPitch.get(l.pitch_id) ?? [];
        arr.push(l.composer);
        byPitch.set(l.pitch_id, arr);
      }
      return (pitches ?? []).map((p: PitchRow) => ({ ...p, composers: byPitch.get(p.id) ?? [] }));
    },
  });
}

function PitchesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listQ = usePitches();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [composer, setComposer] = useState("todos");
  const [creating, setCreating] = useState(false);

  const composerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of listQ.data ?? []) for (const c of p.composers) map.set(c.id, c.full_name);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [listQ.data]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (listQ.data ?? []).filter((p: PitchRow) => {
      if (estado !== "todos" && p.estado !== estado) return false;
      if (tipo !== "todos" && p.tipo !== tipo) return false;
      if (composer !== "todos" && !p.composers.some((c: any) => c.id === composer)) return false;
      if (needle && !String(p.titulo ?? "").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [listQ.data, q, estado, tipo, composer]);

  async function createPitch() {
    setCreating(true);
    const { data, error } = await db
      .from("oportunidades_pitches")
      .insert({ titulo: "Nuevo pitch", estado: "En preparación", tipo: "Música original" })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) return toast.error(error?.message ?? "No se pudo crear el pitch");
    qc.invalidateQueries({ queryKey: ["pitches"] });
    navigate({ to: "/oportunidades/pitches/$pitchId", params: { pitchId: data.id } });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Oportunidades de ventas</p>
          <h1 className="mt-1 font-display text-5xl title-caps">PITCHES</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Propuestas activas de roster IC a productoras, medios, directores y supervisores.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-56 rounded-sm" />
          <ExportRowsButton rows={rows} filename="pitches" sheetName="Pitches" />
          <Button onClick={createPitch} disabled={creating}>
            <Plus className="mr-1 h-4 w-4" /> Añadir pitch
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {PITCH_ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {PITCH_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={composer} onValueChange={setComposer}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los representados</SelectItem>
            {composerOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {listQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        <EmptyState icon={Sparkles} title="Sin pitches" description="Añade la primera propuesta con «Añadir pitch»." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {["Título", "Representados", "Destinatario", "Tipo", "Estado", "Fecha pitch", "Responsable"].map((h) => (
                  <th key={h} className="px-3 py-2 smallcaps text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p: PitchRow) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-display">
                    <Link to="/oportunidades/pitches/$pitchId" params={{ pitchId: p.id }} className="hover:underline">
                      {p.titulo || "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.composers.length
                        ? p.composers.map((c: any) => (
                            <span key={c.id} className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px]">{c.full_name}</span>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.partner?.nombre ?? p.proyecto_vinculado ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.tipo ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] smallcaps", PITCH_ESTADO_CLASS[p.estado] ?? "bg-muted")}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(p.fecha_pitch)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.responsable?.full_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/pitches")({
  component: PitchesPage,
});