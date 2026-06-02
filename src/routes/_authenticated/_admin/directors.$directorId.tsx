import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { PRODUCTION_KIND_LABEL, PRODUCTION_KINDS, type ProductionKind } from "@/lib/production-constants";

export const Route = createFileRoute("/_authenticated/_admin/directors/$directorId")({
  component: DirectorDetail,
});

function DirectorDetail() {
  const { directorId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState("");
  const [newYear, setNewYear] = useState<string>(String(new Date().getFullYear()));
  const [newKind, setNewKind] = useState<ProductionKind>("cine");
  const [creating, setCreating] = useState(false);

  async function createProduction(openAfter: boolean) {
    if (!newTitle.trim()) {
      toast.error("Indica un título");
      return;
    }
    setCreating(true);
    const { data, error } = await (supabase as any)
      .from("productions")
      .insert({
        title: newTitle.trim(),
        year: newYear ? parseInt(newYear, 10) : null,
        project_type: newKind,
        kind: PRODUCTION_KIND_LABEL[newKind],
        director_id: directorId,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewTitle("");
    toast.success("Producción creada");
    qc.invalidateQueries({ queryKey: ["director-history", directorId] });
    if (openAfter && data?.id) {
      navigate({ to: "/productions/$productionId", params: { productionId: data.id } });
    }
  }

  const directorQ = useQuery({
    queryKey: ["director", directorId],
    queryFn: async () => {
      const { data, error } = await supabase.from("directors").select("*").eq("id", directorId).single();
      if (error) throw error;
      return data;
    },
  });

  const historyQ = useQuery({
    queryKey: ["director-history", directorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("productions")
        .select("id, title, year, project_type, premiere_date, imdb_url, external_composer, partner_company:production_companies(name), platform:platforms(name), composer:composers(full_name, artistic_name)")
        .eq("director_id", directorId)
        .order("year", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function update(patch: Record<string, string | null>) {
    const { error } = await supabase.from("directors").update(patch as any).eq("id", directorId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["director", directorId] });
  }

  if (directorQ.isLoading || !directorQ.data) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;
  const d: any = directorQ.data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 border-b border-border pb-4">
        <Link to="/directors" className="smallcaps text-xs text-muted-foreground hover:underline">← Directores</Link>
        <h1 className="mt-1 font-display text-4xl">{d.full_name}</h1>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Ficha</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><Label>Nombre</Label><Input defaultValue={d.full_name} onBlur={(e) => e.target.value !== d.full_name && update({ full_name: e.target.value })} /></div>
          <div><Label>Agente</Label><Input defaultValue={d.agent ?? ""} onBlur={(e) => update({ agent: e.target.value || null })} /></div>
          <div><Label>Email</Label><Input defaultValue={d.email ?? ""} onBlur={(e) => update({ email: e.target.value || null })} /></div>
          <div><Label>Teléfono</Label><Input defaultValue={d.phone ?? ""} onBlur={(e) => update({ phone: e.target.value || null })} /></div>
          <div><Label>País</Label><Input defaultValue={d.country ?? ""} onBlur={(e) => update({ country: e.target.value || null })} /></div>
          <div><Label>Web personal</Label><Input defaultValue={d.website ?? ""} placeholder="https://…" onBlur={(e) => update({ website: e.target.value || null })} /></div>
          <div className="sm:col-span-2"><Label>Enlace IMDb</Label><Input defaultValue={d.imdb_url ?? ""} placeholder="https://www.imdb.com/name/…" onBlur={(e) => update({ imdb_url: e.target.value || null })} /></div>
          <div className="sm:col-span-2"><Label>Notas</Label><Textarea defaultValue={d.notes ?? ""} rows={3} onBlur={(e) => update({ notes: e.target.value || null })} /></div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Histórico de producciones</h2>
        {historyQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !historyQ.data?.length ? (
          <p className="text-sm text-muted-foreground">Aún no hay producciones registradas con este director.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 smallcaps text-xs">Año</th>
                  <th className="px-3 py-2 smallcaps text-xs">Título</th>
                  <th className="px-3 py-2 smallcaps text-xs">Género</th>
                  <th className="px-3 py-2 smallcaps text-xs">Productora</th>
                  <th className="px-3 py-2 smallcaps text-xs">Plataforma</th>
                  <th className="px-3 py-2 smallcaps text-xs">Compositor</th>
                  <th className="px-3 py-2 smallcaps text-xs">IMDb</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historyQ.data.map((p: any) => {
                  const composerLabel = p.composer?.artistic_name || p.composer?.full_name || p.external_composer || "—";
                  const isExternal = !p.composer && !!p.external_composer;
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{p.year ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Link to="/productions/$productionId" params={{ productionId: p.id }} className="font-display hover:underline">{p.title}</Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.project_type ? PRODUCTION_KIND_LABEL[p.project_type as ProductionKind] : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.partner_company?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.platform?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {composerLabel}
                        {isExternal && <span className="ml-1 smallcaps text-[10px] text-muted-foreground">(externo)</span>}
                      </td>
                      <td className="px-3 py-2">
                        {p.imdb_url ? (
                          <a href={p.imdb_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> IMDb
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}