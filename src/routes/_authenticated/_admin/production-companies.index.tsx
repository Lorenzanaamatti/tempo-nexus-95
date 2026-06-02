import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/production-companies/")({
  component: ProductionCompaniesIndex,
});

function ProductionCompaniesIndex() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["production-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_companies").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!name.trim()) return;
    const { error } = await supabase.from("production_companies").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["production-companies"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar productora?")) return;
    const { error } = await supabase.from("production_companies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["production-companies"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">CRM</p>
        <h1 className="mt-1 font-display text-5xl">Productoras</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Partners y productoras vinculables a los proyectos de producción.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la productora" className="w-72" />
        <Button onClick={create} disabled={!name.trim()}><Plus className="mr-1 h-4 w-4" /> Añadir productora</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin productoras.</p>
      ) : (
        <div className="divide-y divide-border rounded-sm border border-border">
          {data.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <Link to="/production-companies/$companyId" params={{ companyId: c.id }} className="flex-1">
                <div className="font-display text-lg hover:underline">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[c.cif, c.city, c.country, c.email].filter(Boolean).join(" · ") || "Sin datos · abre para completar"}
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}