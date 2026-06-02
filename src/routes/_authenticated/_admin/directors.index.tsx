import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
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
        <div className="divide-y divide-border rounded-sm border border-border">
          {data.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <Link to="/directors/$directorId" params={{ directorId: d.id }} className="flex-1">
                <div className="font-display text-lg hover:underline">{d.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {[d.country, d.agent, d.email].filter(Boolean).join(" · ") || "Abre para completar la ficha"}
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}