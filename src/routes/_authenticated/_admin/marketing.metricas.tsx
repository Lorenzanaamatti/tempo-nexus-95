import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHECKLIST_PLATAFORMAS, PLATAFORMAS_METRICAS } from "@/lib/comunicacion-model";
import { useLookupComposers } from "@/components/record-table";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/marketing/metricas")({
  component: MetricasPage,
});

function MetricasPage() {
  const [composerId, setComposerId] = useState<string>("");
  const composersQ = useLookupComposers();

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Marketing</p>
        <h1 className="mt-1 font-display text-5xl title-caps">Métricas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Indicadores de presencia digital de Interesante Compañía y de cada representado. Los valores se introducen manualmente.
        </p>
      </div>

      <Tabs defaultValue="ic">
        <TabsList>
          <TabsTrigger value="ic">IC Global</TabsTrigger>
          <TabsTrigger value="representado">Por representado</TabsTrigger>
        </TabsList>

        <TabsContent value="ic" className="mt-6 space-y-10">
          <MetricsTable composerId={null} />
          <ChecklistTable composerId={null} />
        </TabsContent>

        <TabsContent value="representado" className="mt-6 space-y-10">
          <Select value={composerId} onValueChange={setComposerId}>
            <SelectTrigger className="w-80"><SelectValue placeholder="Selecciona un representado…" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {(composersQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {composerId ? (
            <>
              <MetricsTable composerId={composerId} />
              <ChecklistTable composerId={composerId} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Elige un representado para ver y editar sus métricas.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type MetricRow = {
  id?: string;
  composer_id: string | null;
  plataforma: string;
  seguidores: number | null;
  crecimiento_mes: number | null;
  crecimiento_pct: number | null;
  alcance_promedio: number | null;
  publicaciones_mes: number | null;
  mejor_publicacion_url: string | null;
};

function MetricsTable({ composerId }: { composerId: string | null }) {
  const qc = useQueryClient();
  const key = ["marketing-metricas", composerId ?? "ic"];
  const [nueva, setNueva] = useState("");

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = db.from("marketing_metricas").select("*").order("plataforma");
      q = composerId ? q.eq("composer_id", composerId) : q.is("composer_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
  });

  const rows = useMemo(() => {
    const existing = data ?? [];
    const names = [...new Set([...PLATAFORMAS_METRICAS, ...existing.map((r) => r.plataforma)])];
    return names.map(
      (p) =>
        existing.find((r) => r.plataforma === p) ?? {
          composer_id: composerId,
          plataforma: p,
          seguidores: null, crecimiento_mes: null, crecimiento_pct: null,
          alcance_promedio: null, publicaciones_mes: null, mejor_publicacion_url: null,
        },
    );
  }, [data, composerId]);

  async function save(row: MetricRow, patch: Partial<MetricRow>) {
    const payload = { ...row, ...patch, composer_id: composerId };
    const { error } = row.id
      ? await db.from("marketing_metricas").update(payload).eq("id", row.id)
      : await db.from("marketing_metricas").insert(payload);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  async function addPlatform() {
    if (!nueva.trim()) return;
    const { error } = await db.from("marketing_metricas").insert({ composer_id: composerId, plataforma: nueva.trim() });
    if (error) return toast.error(error.message);
    setNueva("");
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-2xl title-caps">Plataformas</h2>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              {["Plataforma", "Seguidores", "Crec. mes (#)", "Crec. mes (%)", "Alcance promedio", "Publicaciones mes", "Mejor publicación"].map((h) => (
                <th key={h} className="px-3 py-2 smallcaps text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.plataforma}>
                <td className="px-3 py-2 font-display">{r.plataforma}</td>
                {(["seguidores", "crecimiento_mes", "crecimiento_pct", "alcance_promedio", "publicaciones_mes"] as const).map((f) => (
                  <td key={f} className="px-2 py-1">
                    <Input
                      type="number"
                      defaultValue={r[f] ?? ""}
                      className="h-8 w-28 rounded-sm"
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        if (v !== (r[f] ?? null)) save(r, { [f]: v } as Partial<MetricRow>);
                      }}
                    />
                  </td>
                ))}
                <td className="px-2 py-1">
                  <Input
                    defaultValue={r.mejor_publicacion_url ?? ""}
                    placeholder="https://"
                    className="h-8 w-56 rounded-sm"
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v !== (r.mejor_publicacion_url ?? null)) save(r, { mejor_publicacion_url: v });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Añadir plataforma…" className="w-56 rounded-sm" />
        <Button variant="outline" onClick={addPlatform}><Plus className="mr-1 h-4 w-4" /> Añadir plataforma</Button>
      </div>
    </section>
  );
}

function ChecklistTable({ composerId }: { composerId: string | null }) {
  const qc = useQueryClient();
  const key = ["plataforma-checklist", composerId ?? "ic"];
  const [nueva, setNueva] = useState("");

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = db.from("plataforma_checklist").select("*").order("plataforma");
      q = composerId ? q.eq("composer_id", composerId) : q.is("composer_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id?: string; plataforma: string; actualizado: boolean; ultima_actualizacion: string | null }[];
    },
  });

  const rows = useMemo(() => {
    const existing = data ?? [];
    const names = [...new Set([...CHECKLIST_PLATAFORMAS, ...existing.map((r) => r.plataforma)])];
    return names.map((p) => existing.find((r) => r.plataforma === p) ?? { plataforma: p, actualizado: false, ultima_actualizacion: null });
  }, [data]);

  async function save(row: { id?: string; plataforma: string; actualizado: boolean; ultima_actualizacion: string | null }, patch: Record<string, unknown>) {
    const payload = { ...row, ...patch, composer_id: composerId };
    const { error } = row.id
      ? await db.from("plataforma_checklist").update(payload).eq("id", row.id)
      : await db.from("plataforma_checklist").insert(payload);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-2xl title-caps">Checklist de plataformas actualizadas</h2>
      <div className="divide-y divide-border rounded-sm border border-border">
        {rows.map((r) => (
          <div key={r.plataforma} className="flex flex-wrap items-center gap-4 px-4 py-3">
            <Checkbox
              checked={!!r.actualizado}
              onCheckedChange={(v) =>
                save(r, { actualizado: !!v, ultima_actualizacion: v ? new Date().toISOString().slice(0, 10) : r.ultima_actualizacion })
              }
            />
            <span className="font-display">{r.plataforma}</span>
            <Input
              type="date"
              defaultValue={r.ultima_actualizacion ?? ""}
              className="ml-auto h-8 w-44 rounded-sm"
              onBlur={(e) => {
                const v = e.target.value || null;
                if (v !== (r.ultima_actualizacion ?? null)) save(r, { ultima_actualizacion: v });
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Añadir perfil o plataforma…" className="w-64 rounded-sm" />
        <Button
          variant="outline"
          onClick={async () => {
            if (!nueva.trim()) return;
            const { error } = await db.from("plataforma_checklist").insert({ composer_id: composerId, plataforma: nueva.trim() });
            if (error) return toast.error(error.message);
            setNueva("");
            qc.invalidateQueries({ queryKey: key });
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Añadir
        </Button>
      </div>
    </section>
  );
}
