import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/productions/")({
  component: ProductionsIndex,
});

function ProductionsIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState("Película");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["productions", q],
    queryFn: async () => {
      let query = supabase
        .from("productions")
        .select("id, title, kind, year, production_company, director, color")
        .order("title");
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("productions").insert({ title: newTitle.trim(), kind: newKind });
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewTitle("");
    toast.success("Producción creada");
    qc.invalidateQueries({ queryKey: ["productions"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Producciones</p>
          <h1 className="mt-1 font-display text-5xl">Películas y series</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Cada producción puede tener compositores, artistas y supervisores asignados.
          </p>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar título…" className="w-56 rounded-sm" />
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border p-4">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título" className="w-64" />
        <Input value={newKind} onChange={(e) => setNewKind(e.target.value)} placeholder="Tipo (Película, Serie…)" className="w-48" />
        <Button onClick={create} disabled={creating || !newTitle.trim()}>
          <Plus className="mr-1 h-4 w-4" /> Crear producción
        </Button>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin producciones.</p>
      ) : (
        <div className="divide-y divide-border rounded-sm border border-border">
          {data.map((p) => (
            <Link
              key={p.id}
              to="/productions/$productionId"
              params={{ productionId: p.id }}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-muted/40"
            >
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.color ?? "#6366f1" }} />
              <span className="font-display text-lg">{p.title}</span>
              {p.kind && <Badge variant="outline" className="rounded-sm">{p.kind}</Badge>}
              {p.year && <span className="text-xs text-muted-foreground">{p.year}</span>}
              {p.director && <span className="text-xs text-muted-foreground">dir. {p.director}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}