import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PersonEventsEditor } from "@/components/person-events-editor";
import { TEAM_ROLE_LABEL, type TeamRole } from "@/components/composer-team-editor";

export const Route = createFileRoute("/_authenticated/_admin/people/$personId")({
  component: PersonEdit,
});

type PersonRole = "ic_team" | "composer" | "artist" | "supervisor";
const ROLE_LABEL: Record<PersonRole, string> = {
  ic_team: "Equipo IC",
  composer: "Compositor",
  artist: "Artista",
  supervisor: "Supervisor",
};

function PersonEdit() {
  const { personId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["person", personId],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").eq("id", personId).single();
      if (error) throw error;
      return data;
    },
  });

  const assignmentsQ = useQuery({
    queryKey: ["person-assignments", personId],
    queryFn: async () => {
      const { data } = await supabase
        .from("composer_team_assignments")
        .select("id, composer_id, team_role, role_other, start_date, objectives, kpi_review, kpi_review_date, composers(full_name, artistic_name)")
        .eq("person_id", personId)
        .order("start_date", { ascending: false });
      return data ?? [];
    },
  });

  const [form, setForm] = useState({ full_name: "", role: "ic_team" as PersonRole, email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        role: data.role as PersonRole,
        email: data.email ?? "",
        phone: data.phone ?? "",
        notes: data.notes ?? "",
      });
    }
  }, [data]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("people")
      .update({
        full_name: form.full_name,
        role: form.role,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      })
      .eq("id", personId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    refetch();
  }

  async function remove() {
    if (!confirm("¿Eliminar esta persona? Se perderán sus eventos del calendario.")) return;
    const { error } = await supabase.from("people").delete().eq("id", personId);
    if (error) return toast.error(error.message);
    navigate({ to: "/people" });
  }

  if (isLoading || !data) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <Link to="/people" className="smallcaps text-xs text-muted-foreground hover:underline">← Personas</Link>
          <h1 className="mt-1 font-display text-4xl">{form.full_name || "—"}</h1>
        </div>
        <div className="flex gap-2">
          {data.composer_id && (
            <Button asChild variant="outline" size="sm">
              <Link to="/composers/$composerId" params={{ composerId: data.composer_id }}>
                Abrir ficha de compositor
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={remove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Nombre completo</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} disabled={!!data.composer_id} />
        </div>
        <div>
          <Label>Rol</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as PersonRole })} disabled={!!data.composer_id}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as PersonRole[]).map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Eventos en el calendario</h2>
        <PersonEventsEditor personId={personId} />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Representados asignados</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Plan de personal por representado: rol, fecha de inicio, objetivos y revisión KPI. Para editar, abre la ficha del representado.
        </p>
        {assignmentsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !assignmentsQ.data?.length ? (
          <p className="text-sm text-muted-foreground">Sin asignaciones.</p>
        ) : (
          <ul className="space-y-3">
            {assignmentsQ.data.map((a: any) => {
              const name = a.composers?.artistic_name || a.composers?.full_name || "—";
              const roleLabel =
                a.team_role === "otro" && a.role_other
                  ? `Otro · ${a.role_other}`
                  : TEAM_ROLE_LABEL[a.team_role as TeamRole];
              return (
                <li key={a.id} className="rounded-sm border border-border p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <Link
                      to="/composers/$composerId"
                      params={{ composerId: a.composer_id }}
                      className="font-display text-lg hover:underline"
                    >
                      {name}
                    </Link>
                    <span className="smallcaps text-xs text-muted-foreground">{roleLabel}</span>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <p><span className="text-muted-foreground">Inicio:</span> {a.start_date ?? "—"}</p>
                    <p><span className="text-muted-foreground">Próxima revisión KPI:</span> {a.kpi_review_date ?? "—"}</p>
                  </div>
                  {a.objectives && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      <span className="text-muted-foreground">Objetivos: </span>{a.objectives}
                    </p>
                  )}
                  {a.kpi_review && (
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      <span className="text-muted-foreground">Revisión KPI: </span>{a.kpi_review}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}