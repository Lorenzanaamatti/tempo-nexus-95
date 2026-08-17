import { PageCrumb } from "@/components/breadcrumbs";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/list-states";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { toast } from "sonner";
import { formatDateEs } from "@/lib/dates";
import { RelatedWorks } from "@/components/related-works";
import { CrmTransferMenu } from "@/components/crm-transfer-menu";
import { companyToTargetAccount, companyToOpportunity } from "@/lib/crm-transfer";

export const Route = createFileRoute("/_authenticated/_admin/production-companies/$companyId")({
  component: CompanyDetail,
});

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const companyQ = useQuery({
    queryKey: ["production-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_companies").select("*").eq("id", companyId).single();
      if (error) throw error;
      return data;
    },
  });

  const historyQ = useQuery({
    queryKey: ["production-company-history", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productions")
        .select("id, title, year, premiere_date, status, composer:composers(full_name, artistic_name), negotiator:people!productions_negotiator_person_id_fkey(full_name)")
        .eq("partner_company_id", companyId)
        .order("year", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function update(patch: Record<string, string | null>) {
    const { error } = await supabase.from("production_companies").update(patch as any).eq("id", companyId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["production-company", companyId] });
  }

  const cData: any = companyQ.data;
  useEffect(() => {
    if (!cData) return;
    setForm({
      name: cData.name ?? "", legal_name: cData.legal_name ?? "", cif: cData.cif ?? "",
      website: cData.website ?? "", address: cData.address ?? "", city: cData.city ?? "",
      country: cData.country ?? "", contact_name: cData.contact_name ?? "", email: cData.email ?? "",
      phone: cData.phone ?? "", area_managers: cData.area_managers ?? "",
      contract_notes: cData.contract_notes ?? "", notes: cData.notes ?? "",
    });
  }, [cData]);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form["name"]?.trim()) return toast.error("El nombre es obligatorio");
    setSaving(true);
    const v = (k: string) => (form[k]?.trim() ? form[k]!.trim() : null);
    await update({
      name: form["name"]!.trim(), legal_name: v("legal_name"), cif: v("cif"), website: v("website"),
      address: v("address"), city: v("city"), country: v("country"), contact_name: v("contact_name"),
      email: v("email"), phone: v("phone"), area_managers: v("area_managers"),
      contract_notes: v("contract_notes"), notes: v("notes"),
    });
    setSaving(false);
    toast.success("Ficha guardada");
  }

  async function remove() {
    const { error } = await supabase.from("production_companies").delete().eq("id", companyId);
    if (error) return toast.error(error.message);
    toast.success("Productora eliminada");
    qc.invalidateQueries({ queryKey: ["production-companies"] });
    navigate({ to: "/production-companies" });
  }

  if (companyQ.isLoading || !companyQ.data) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;
  const c: any = companyQ.data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <PageCrumb label={c.name} />
          <h1 className="mt-1 font-display text-4xl">{c.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <CrmTransferMenu
          actions={[
            {
              label: "Cuentas objetivo",
              description: "Crea la cuenta vinculada a esta productora",
              onSelect: async () => {
                const r = await companyToTargetAccount(c);
                if (r) navigate({ to: "/marketing/target-accounts/$accountId", params: { accountId: r.id } });
              },
            },
            {
              label: "Oportunidades",
              description: "Crea la oportunidad con esta productora como partner",
              onSelect: async () => {
                const r = await companyToOpportunity(c);
                if (r) navigate({ to: "/opportunities/$opportunityId", params: { opportunityId: r.id } });
              },
            },
          ]}
        />
          <ConfirmDeleteButton
            onConfirm={remove}
            title={`¿Eliminar ${c.name}?`}
            description="Se eliminará la ficha de la productora. Las producciones vinculadas se mantienen."
          />
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Datos generales</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><Label>Nombre comercial</Label><Input value={form["name"] ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Razón social</Label><Input value={form["legal_name"] ?? ""} onChange={(e) => set("legal_name", e.target.value)} /></div>
          <div><Label>CIF / NIF</Label><Input value={form["cif"] ?? ""} onChange={(e) => set("cif", e.target.value)} /></div>
          <div><Label>Web</Label><Input value={form["website"] ?? ""} onChange={(e) => set("website", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Dirección fiscal</Label><Input value={form["address"] ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
          <div><Label>Ciudad</Label><Input value={form["city"] ?? ""} onChange={(e) => set("city", e.target.value)} /></div>
          <div><Label>País</Label><Input value={form["country"] ?? ""} onChange={(e) => set("country", e.target.value)} /></div>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl">Contacto principal</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><Label>Contacto</Label><Input value={form["contact_name"] ?? ""} onChange={(e) => set("contact_name", e.target.value)} /></div>
          <div><Label>Email</Label><Input value={form["email"] ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
          <div><Label>Teléfono</Label><Input value={form["phone"] ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
        </div>
        <div>
          <Label>Responsables de área</Label>
          <Textarea value={form["area_managers"] ?? ""} rows={3} placeholder="Producción ejecutiva: … · Postproducción: … · Música: …" onChange={(e) => set("area_managers", e.target.value)} />
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl">Datos contractuales</h2>
        <Textarea value={form["contract_notes"] ?? ""} rows={4} placeholder="Condiciones marco, NDA, cuentas bancarias, etc." onChange={(e) => set("contract_notes", e.target.value)} />
        <Textarea value={form["notes"] ?? ""} rows={3} placeholder="Notas internas" onChange={(e) => set("notes", e.target.value)} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Histórico de producciones</h2>
        {historyQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !historyQ.data?.length ? (
          <EmptyState variant="inline" icon={Clapperboard} title="Sin producciones" description="Vincula producciones a esta productora para ver aquí su histórico." action={{ label: "Ver producciones", to: "/productions" }} />
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 smallcaps text-xs">Año</th>
                  <th className="px-3 py-2 smallcaps text-xs">Título</th>
                  <th className="px-3 py-2 smallcaps text-xs">Roster asignado</th>
                  <th className="px-3 py-2 smallcaps text-xs">Responsable IC</th>
                  <th className="px-3 py-2 smallcaps text-xs">Estreno</th>
                  <th className="px-3 py-2 smallcaps text-xs">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historyQ.data.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">{p.year ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Link to="/productions/$productionId" params={{ productionId: p.id }} className="font-display hover:underline">{p.title}</Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.composer?.artistic_name || p.composer?.full_name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.negotiator?.full_name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDateEs(p.premiere_date)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-10">
        <RelatedWorks kind="company" id={companyId} title="Obras vinculadas (cruce CRM)" />
      </div>
    </div>
  );
}