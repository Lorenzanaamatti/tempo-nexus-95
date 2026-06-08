import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/plantillas/")({
  component: PlantillasIndex,
});

function PlantillasIndex() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["dm-plantillas"],
    queryFn: async () => ((await supabase.from("dm_plantillas").select("*").order("nombre")).data ?? []),
  });

  async function createBlank() {
    const { data, error } = await supabase.from("dm_plantillas").insert({
      nombre: "Nueva plantilla",
      descripcion: "",
      email_asunto_template: "Deal memo · {{obra}}",
      email_cuerpo_template: "Hola {{cliente}},\n\n…",
      email_firma: "Interesante Compañía SL",
      instrucciones_para_agente: "Describe aquí cómo debe redactar la IA este tipo de deal memo.",
      activa: false,
    }).select("id").single();
    if (error || !data) return toast.error(error?.message ?? "Error");
    qc.invalidateQueries({ queryKey: ["dm-plantillas"] });
    navigate({ to: "/deal-memos/plantillas/$plantillaId", params: { plantillaId: data.id } });
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Plantillas reutilizables para generar deal memos con IA.</p>
        <Button onClick={createBlank}><Plus className="mr-1 h-4 w-4" />Nueva plantilla</Button>
      </div>
      {q.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          <LayoutTemplate className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No hay plantillas. Crea la primera.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {q.data!.map((p: any) => (
            <Link key={p.id} to="/deal-memos/plantillas/$plantillaId" params={{ plantillaId: p.id }} className="block rounded-sm border border-border bg-card p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg">{p.nombre}</h3>
                <span className={`rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-wider ${p.activa ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
                  {p.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.descripcion || "Sin descripción"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}