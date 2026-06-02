import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/directors/")({
  component: DirectorsIndex,
});

function DirectorsIndex() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["directors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("directors").select("*").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!name.trim()) return;
    const { error } = await supabase.from("directors").insert({ full_name: name.trim() });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["directors"] });
  }

  async function update(id: string, patch: Record<string, string | null>) {
    const { error } = await supabase.from("directors").update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["directors"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar director?")) return;
    const { error } = await supabase.from("directors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["directors"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">CRM</p>
        <h1 className="mt-1 font-display text-5xl">Directores</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Directores vinculables a los proyectos de producción.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del director" className="w-72" />
        <Button onClick={create} disabled={!name.trim()}><Plus className="mr-1 h-4 w-4" /> Añadir director</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin directores.</p>
      ) : (
        <div className="space-y-3">
          {data.map((d: any) => (
            <div key={d.id} className="rounded-sm border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <Input defaultValue={d.full_name} onBlur={(e) => e.target.value !== d.full_name && update(d.id, { full_name: e.target.value })} className="font-display text-lg" />
                <Button variant="ghost" size="sm" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input defaultValue={d.email ?? ""} placeholder="Email" onBlur={(e) => update(d.id, { email: e.target.value || null })} />
                <Input defaultValue={d.phone ?? ""} placeholder="Teléfono" onBlur={(e) => update(d.id, { phone: e.target.value || null })} />
                <Input defaultValue={d.agent ?? ""} placeholder="Agente" onBlur={(e) => update(d.id, { agent: e.target.value || null })} />
                <Input defaultValue={d.country ?? ""} placeholder="País" onBlur={(e) => update(d.id, { country: e.target.value || null })} />
              </div>
              <Textarea defaultValue={d.notes ?? ""} placeholder="Notas" rows={2} className="mt-2" onBlur={(e) => update(d.id, { notes: e.target.value || null })} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}