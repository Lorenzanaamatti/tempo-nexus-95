import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/platforms/")({
  component: PlatformsIndex,
});

function PlatformsIndex() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platforms").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!name.trim()) return;
    const { error } = await supabase.from("platforms").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["platforms"] });
  }

  async function update(id: string, patch: Record<string, string | null>) {
    const { error } = await supabase.from("platforms").update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["platforms"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar plataforma?")) return;
    const { error } = await supabase.from("platforms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["platforms"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">CRM</p>
        <h1 className="mt-1 font-display text-5xl">Plataformas</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Plataformas de distribución y streaming vinculables a las producciones.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la plataforma" className="w-72" />
        <Button onClick={create} disabled={!name.trim()}><Plus className="mr-1 h-4 w-4" /> Añadir plataforma</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin plataformas.</p>
      ) : (
        <div className="space-y-3">
          {data.map((p: any) => (
            <div key={p.id} className="rounded-sm border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <Input defaultValue={p.name} onBlur={(e) => e.target.value !== p.name && update(p.id, { name: e.target.value })} className="font-display text-lg" />
                <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input defaultValue={p.contact_name ?? ""} placeholder="Contacto" onBlur={(e) => update(p.id, { contact_name: e.target.value || null })} />
                <Input defaultValue={p.email ?? ""} placeholder="Email" onBlur={(e) => update(p.id, { email: e.target.value || null })} />
                <Input defaultValue={p.phone ?? ""} placeholder="Teléfono" onBlur={(e) => update(p.id, { phone: e.target.value || null })} />
                <Input defaultValue={p.website ?? ""} placeholder="Web" onBlur={(e) => update(p.id, { website: e.target.value || null })} />
                <Input defaultValue={p.country ?? ""} placeholder="País" onBlur={(e) => update(p.id, { country: e.target.value || null })} />
              </div>
              <Textarea defaultValue={p.notes ?? ""} placeholder="Notas" rows={2} className="mt-2" onBlur={(e) => update(p.id, { notes: e.target.value || null })} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}