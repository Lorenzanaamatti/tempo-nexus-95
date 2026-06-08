import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/")({
  component: DealMemosIndex,
});

const ESTADO_TONE: Record<string, string> = {
  borrador: "bg-muted text-foreground",
  generando: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  revision_interna: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  corrigiendo: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  revision_final: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  enviado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  respondido: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  cerrado: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  cancelado: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function DealMemosIndex() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    referencia: "",
    obra: "",
    destinatario_final_email: "",
    plantilla_id: "",
  });

  const memosQ = useQuery({
    queryKey: ["deal-memos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_memos")
        .select("id, referencia, obra, estado, destinatario_final_email, fecha_envio, created_at, plantilla_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const plantillasQ = useQuery({
    queryKey: ["dm-plantillas-min"],
    queryFn: async () => {
      const { data } = await supabase.from("dm_plantillas").select("id, nombre, activa").eq("activa", true);
      return data ?? [];
    },
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.referencia || !form.obra || !form.destinatario_final_email) {
      toast.error("Referencia, obra y destinatario son obligatorios");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("deal_memos").insert({
      referencia: form.referencia,
      obra: form.obra,
      destinatario_final_email: form.destinatario_final_email,
      plantilla_id: form.plantilla_id || null,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Deal memo creado");
    setForm({ referencia: "", obra: "", destinatario_final_email: "", plantilla_id: "" });
    qc.invalidateQueries({ queryKey: ["deal-memos"] });
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="mb-6 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Plusmusic / IC</p>
        <h1 className="mt-1 font-display text-5xl">Deal memos</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Acuerdos pre-contractuales generados con IA, revisados internamente y validados antes de enviar.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-6 grid gap-2 rounded-sm border border-border bg-card p-3 md:grid-cols-5">
        <Input
          placeholder="Referencia (DM-2026-001)"
          value={form.referencia}
          onChange={(e) => setForm((p) => ({ ...p, referencia: e.target.value }))}
        />
        <Input
          placeholder="Obra"
          value={form.obra}
          onChange={(e) => setForm((p) => ({ ...p, obra: e.target.value }))}
        />
        <Input
          type="email"
          placeholder="Destinatario final"
          value={form.destinatario_final_email}
          onChange={(e) => setForm((p) => ({ ...p, destinatario_final_email: e.target.value }))}
        />
        <Select value={form.plantilla_id} onValueChange={(v) => setForm((p) => ({ ...p, plantilla_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Plantilla (opcional)" /></SelectTrigger>
          <SelectContent>
            {(plantillasQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={creating}><Plus className="mr-1 h-4 w-4" /> Crear</Button>
      </form>

      {memosQ.isLoading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (memosQ.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay deal memos. Crea el primero arriba.</p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Referencia</th>
                <th className="px-3 py-2">Obra</th>
                <th className="px-3 py-2">Destinatario</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Creado</th>
              </tr>
            </thead>
            <tbody>
              {(memosQ.data ?? []).map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link to="/deal-memos/$dealMemoId" params={{ dealMemoId: m.id }} className="hover:underline">
                      {m.referencia}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{m.obra}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.destinatario_final_email}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-wider ${ESTADO_TONE[m.estado] ?? ""}`}>
                      {m.estado.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateEs(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}