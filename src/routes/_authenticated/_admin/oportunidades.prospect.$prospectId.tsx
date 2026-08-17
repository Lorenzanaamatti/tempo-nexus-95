import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { toast } from "sonner";
import { formatDateEs } from "@/lib/dates";
import { ROLES_FICHAJE } from "@/lib/producciones-espanolas";
import { ROSTER_PROSPECT_ESTADOS, type RosterProspectEstado } from "@/lib/kpi-constants";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/prospect/$prospectId")({
  component: ProspectDetailPage,
  head: () => ({
    meta: [
      { title: "Ficha de prospect de fichaje | Interesante Compañía" },
      { name: "description", content: "Ficha del prospect de fichaje con su filmografía en producciones españolas." },
      { property: "og:title", content: "Ficha de prospect de fichaje" },
      { property: "og:description", content: "Datos de contacto, estado del fichaje y películas en las que participa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const db = supabase as any;

function ProspectDetailPage() {
  const { prospectId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["roster-prospect", prospectId],
    queryFn: async () => {
      const { data, error } = await db.from("roster_prospects").select("*").eq("id", prospectId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const nombre: string = data?.nombre ?? "";

  const films = useQuery({
    queryKey: ["prospect-filmografia", nombre],
    enabled: !!nombre,
    queryFn: async () => {
      const like = `%${nombre}%`;
      const cols = ["mezclador", "orquestador", "orquesta", "director_orquesta", "composer", "music_supervisor"];
      const { data, error } = await db
        .from("producciones_espanolas")
        .select("id, title, title_es, year, mezclador, orquestador, orquesta, director_orquesta, composer, music_supervisor")
        .or(cols.map((c) => `${c}.ilike.${like}`).join(","))
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  async function save() {
    if (!form) return;
    setSaving(true);
    const { error } = await db
      .from("roster_prospects")
      .update({
        nombre: form.nombre,
        rol: form.rol || null,
        estado: form.estado,
        ciudad: form.ciudad || null,
        pais: form.pais || null,
        fecha_primer_contacto: form.fecha_primer_contacto || null,
        notas: form.notas || null,
      })
      .eq("id", prospectId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Ficha guardada");
    qc.invalidateQueries({ queryKey: ["roster-prospect", prospectId] });
    qc.invalidateQueries({ queryKey: ["roster-prospects"] });
  }

  async function remove() {
    const { error } = await db.from("roster_prospects").delete().eq("id", prospectId);
    if (error) return toast.error(error.message);
    toast.success("Prospect eliminado");
    qc.invalidateQueries({ queryKey: ["roster-prospects"] });
    navigate({ to: "/oportunidades/prospects-fichaje" });
  }

  if (isLoading || !form) return <div className="p-6"><ListSkeleton /></div>;

  const rolesEnFilm = (f: any) => {
    const n = nombre.toLowerCase();
    const labels: string[] = [];
    for (const r of ROLES_FICHAJE) if ((f[r.key] ?? "").toLowerCase().includes(n)) labels.push(r.label);
    if ((f.composer ?? "").toLowerCase().includes(n)) labels.push("Compositor BSO");
    if ((f.music_supervisor ?? "").toLowerCase().includes(n)) labels.push("Supervisor musical");
    return labels;
  };

  return (
    <div className="space-y-6 p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <Link to="/oportunidades/prospects-fichaje" className="hover:text-foreground">Oportunidades · Prospects de fichaje</Link>
      </p>
      <PageHeader
        title={(form.nombre ?? "").toUpperCase()}
        description="Ficha de prospect de fichaje y películas en las que participa."
        actions={
          <>
            <Button onClick={() => void save()} disabled={saving}>Guardar</Button>
            <ConfirmDeleteButton onConfirm={remove} title={`Eliminar a ${form.nombre}`} />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Nombre</Label>
          <Input value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label>Rol / especialidad</Label>
          <Input
            list="roles-fichaje"
            value={form.rol ?? ""}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
            placeholder="Mezclador, orquestador…"
          />
          <datalist id="roles-fichaje">
            {ROLES_FICHAJE.map((r) => <option key={r.key} value={r.label} />)}
          </datalist>
        </div>
        <div className="grid gap-1.5">
          <Label>Estado</Label>
          <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as RosterProspectEstado })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROSTER_PROSPECT_ESTADOS.map((o: any) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Primer contacto</Label>
          <Input
            type="date"
            value={form.fecha_primer_contacto ?? ""}
            onChange={(e) => setForm({ ...form, fecha_primer_contacto: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Ciudad</Label>
          <Input value={form.ciudad ?? ""} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label>País</Label>
          <Input value={form.pais ?? ""} onChange={(e) => setForm({ ...form, pais: e.target.value })} />
        </div>
        <div className="grid gap-1.5 md:col-span-2">
          <Label>Notas</Label>
          <Textarea rows={4} value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-extrabold title-caps">Películas en las que participa</h2>
        {films.isLoading ? (
          <ListSkeleton />
        ) : (films.data ?? []).length === 0 ? (
          <EmptyState title="Sin películas asociadas" description="Aparecerán aquí las producciones españolas donde figure esta persona." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-2 pr-3 text-left">Año</th>
                  <th className="py-2 pr-3 text-left">Título</th>
                  <th className="py-2 text-left">Función</th>
                </tr>
              </thead>
              <tbody>
                {(films.data ?? []).map((f: any) => (
                  <tr key={f.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{f.year ?? "—"}</td>
                    <td className="py-2 pr-3 font-display">{f.title_es ?? f.title}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {rolesEnFilm(f).map((l) => (
                          <Badge key={l} variant="secondary" className="rounded-sm text-[10px]">{l}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form.fecha_primer_contacto && (
        <p className="font-mono text-[11px] text-muted-foreground">
          Primer contacto: {formatDateEs(form.fecha_primer_contacto)}
        </p>
      )}
    </div>
  );
}