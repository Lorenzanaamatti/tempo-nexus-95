import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { PageCrumb } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/list-states";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonPhotoUploader } from "@/components/person-photo-uploader";
import { CONTRATO_TIPOS, IC_ROLES } from "@/lib/comunicacion-model";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/empresa/equipo/$personId")({
  component: EquipoDetail,
});

const EMPTY = {
  full_name: "", last_name: "", email: "", phone: "",
  role_description: "", contract_type: "", contract_start: "", contract_end: "",
  contract_salary_annual: "", contract_fee_amount: "", contract_fee_period: "", contract_notes: "",
};

function EquipoDetail() {
  const { personId } = Route.useParams();
  const { isBigC, loading } = useCurrentRole();
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [roles, setRoles] = useState<string[]>([]);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["equipo-person", personId],
    queryFn: async () => {
      const { data, error } = await db.from("people").select("*").eq("id", personId).maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });

  const kpis = useQuery({
    queryKey: ["equipo-person-kpis", personId],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      const iso = monthStart.toISOString().slice(0, 10);
      const [reps, activas, pend, done, contratos, memos] = await Promise.all([
        db.from("composers").select("id", { count: "exact", head: true }).eq("agent_person_id", personId),
        db.from("production_assignments").select("id", { count: "exact", head: true }).eq("person_id", personId),
        db.from("actions").select("id", { count: "exact", head: true }).eq("assignee_person_id", personId).eq("done", false),
        db.from("actions").select("id", { count: "exact", head: true }).eq("assignee_person_id", personId).eq("done", true).gte("done_at", iso),
        db.from("contracts").select("id", { count: "exact", head: true }).eq("signer_person_id", personId).gte("created_at", iso),
        db.from("deal_memos").select("id", { count: "exact", head: true }).eq("validador_interno_id", personId).gte("created_at", iso),
      ]);
      return {
        representados: reps.count ?? 0,
        proyectos: activas.count ?? 0,
        pendientes: pend.count ?? 0,
        completadas: done.count ?? 0,
        documentos: (contratos.count ?? 0) + (memos.count ?? 0),
      };
    },
    enabled: isBigC,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      full_name: data.full_name ?? "", last_name: data.last_name ?? "", email: data.email ?? "", phone: data.phone ?? "",
      role_description: data.role_description ?? "", contract_type: data.contract_type ?? "",
      contract_start: data.contract_start ?? "", contract_end: data.contract_end ?? "",
      contract_salary_annual: data.contract_salary_annual ?? "", contract_fee_amount: data.contract_fee_amount ?? "",
      contract_fee_period: data.contract_fee_period ?? "", contract_notes: data.contract_notes ?? "",
    });
    setRoles(Array.isArray(data.ic_roles) ? data.ic_roles : []);
    setPhotoPath(data.photo_path ?? null);
  }, [data]);

  async function save() {
    setSaving(true);
    const num = (v: string) => (v === "" ? null : Number(v));
    const { error } = await db.from("people").update({
      full_name: form.full_name, last_name: form.last_name || null,
      email: form.email || null, phone: form.phone || null,
      ic_roles: roles, role_description: form.role_description || null,
      contract_type: form.contract_type || null,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      contract_salary_annual: num(form.contract_salary_annual),
      contract_fee_amount: num(form.contract_fee_amount),
      contract_fee_period: form.contract_fee_period || null,
      contract_notes: form.contract_notes || null,
    }).eq("id", personId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Ficha guardada");
    refetch();
  }

  if (loading) return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  if (!isBigC) {
    return <div className="mx-auto max-w-4xl px-6 py-10"><EmptyState title="Sin acceso" description="Esta sección solo está disponible para BIG C." /></div>;
  }
  if (data && data.is_virtual_assistant) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <EmptyState
          title="Es un agente IA"
          description="Los agentes se gestionan en EMPRESA > Agentes IA."
          action={{ label: "Ir a Agentes IA", to: "/empresa/agentes" }}
        />
      </div>
    );
  }

  const laboral = form.contract_type.startsWith("laboral");
  const freelance = form.contract_type === "freelance" || form.contract_type === "proveedor";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <PageCrumb label={form.full_name || "Miembro"} />
          <h1 className="mt-1 font-display text-4xl title-caps">{[form.full_name, form.last_name].filter(Boolean).join(" ") || "—"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/people/$personId" params={{ personId }}>Funciones y agenda</Link></Button>
          <Button onClick={save} disabled={saving}>Guardar</Button>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl title-caps">Datos personales</h2>
        <div className="mb-4"><PersonPhotoUploader personId={personId} photoPath={photoPath} onChange={setPhotoPath} /></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Apellidos"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
          <Field label="Email corporativo"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Teléfono"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl title-caps">Rol en IC</h2>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {IC_ROLES.map((r) => {
            const on = roles.includes(r.value);
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRoles(on ? roles.filter((x) => x !== r.value) : [...roles, r.value])}
                className={cn("rounded-sm border px-2.5 py-1 text-xs transition", on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <Field label="Descripción del rol">
          <Textarea rows={3} value={form.role_description} onChange={(e) => setForm({ ...form, role_description: e.target.value })} />
        </Field>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 font-display text-2xl title-caps">Datos de contrato</h2>
        <p className="mb-3 text-xs text-muted-foreground">Visible únicamente para BIG C.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de contrato">
            <Select value={form.contract_type || ""} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>{CONTRATO_TIPOS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Fecha de inicio"><Input type="date" value={form.contract_start} onChange={(e) => setForm({ ...form, contract_start: e.target.value })} /></Field>
          {form.contract_type === "laboral_temporal" && (
            <Field label="Fecha de fin"><Input type="date" value={form.contract_end} onChange={(e) => setForm({ ...form, contract_end: e.target.value })} /></Field>
          )}
          {laboral && (
            <Field label="Retribución anual bruta (€)">
              <Input type="number" value={form.contract_salary_annual} onChange={(e) => setForm({ ...form, contract_salary_annual: e.target.value })} />
            </Field>
          )}
          {freelance && (
            <>
              <Field label="Honorarios / tarifa (€)">
                <Input type="number" value={form.contract_fee_amount} onChange={(e) => setForm({ ...form, contract_fee_amount: e.target.value })} />
              </Field>
              <Field label="Periodicidad">
                <Select value={form.contract_fee_period || ""} onValueChange={(v) => setForm({ ...form, contract_fee_period: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="por_proyecto">Por proyecto</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <div className="col-span-2">
            <Field label="Notas de contrato">
              <Textarea rows={3} value={form.contract_notes} onChange={(e) => setForm({ ...form, contract_notes: e.target.value })} />
            </Field>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl title-caps">KPIs del miembro</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Representados a su cargo" value={kpis.data?.representados} />
          <Kpi label="Proyectos activos" value={kpis.data?.proyectos} />
          <Kpi label="Tareas pendientes" value={kpis.data?.pendientes} />
          <Kpi label="Tareas completadas (mes)" value={kpis.data?.completadas} />
          <Kpi label="Documentos generados (mes)" value={kpis.data?.documentos} />
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}

function Kpi({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-sm border border-border p-4">
      <p className="font-display text-3xl tabular-nums">{value ?? "—"}</p>
      <p className="mt-1 smallcaps text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
