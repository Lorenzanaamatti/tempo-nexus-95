import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDateEs } from "@/lib/dates";
import { RelatedWorks } from "@/components/related-works";

export const Route = createFileRoute("/_authenticated/_admin/production-companies/$companyId")({
  component: CompanyDetail,
});

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const qc = useQueryClient();

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

  if (companyQ.isLoading || !companyQ.data) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;
  const c: any = companyQ.data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 border-b border-border pb-4">
        <Link to="/production-companies" className="smallcaps text-xs text-muted-foreground hover:underline">← Productoras</Link>
        <h1 className="mt-1 font-display text-4xl">{c.name}</h1>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Datos generales</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><Label>Nombre comercial</Label><Input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && update({ name: e.target.value })} /></div>
          <div><Label>Razón social</Label><Input defaultValue={c.legal_name ?? ""} onBlur={(e) => update({ legal_name: e.target.value || null })} /></div>
          <div><Label>CIF / NIF</Label><Input defaultValue={c.cif ?? ""} onBlur={(e) => update({ cif: e.target.value || null })} /></div>
          <div><Label>Web</Label><Input defaultValue={c.website ?? ""} onBlur={(e) => update({ website: e.target.value || null })} /></div>
          <div className="sm:col-span-2"><Label>Dirección fiscal</Label><Input defaultValue={c.address ?? ""} onBlur={(e) => update({ address: e.target.value || null })} /></div>
          <div><Label>Ciudad</Label><Input defaultValue={c.city ?? ""} onBlur={(e) => update({ city: e.target.value || null })} /></div>
          <div><Label>País</Label><Input defaultValue={c.country ?? ""} onBlur={(e) => update({ country: e.target.value || null })} /></div>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl">Contacto principal</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><Label>Contacto</Label><Input defaultValue={c.contact_name ?? ""} onBlur={(e) => update({ contact_name: e.target.value || null })} /></div>
          <div><Label>Email</Label><Input defaultValue={c.email ?? ""} onBlur={(e) => update({ email: e.target.value || null })} /></div>
          <div><Label>Teléfono</Label><Input defaultValue={c.phone ?? ""} onBlur={(e) => update({ phone: e.target.value || null })} /></div>
        </div>
        <div>
          <Label>Responsables de área</Label>
          <Textarea defaultValue={c.area_managers ?? ""} rows={3} placeholder="Producción ejecutiva: … · Postproducción: … · Música: …" onBlur={(e) => update({ area_managers: e.target.value || null })} />
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-2xl">Datos contractuales</h2>
        <Textarea defaultValue={c.contract_notes ?? ""} rows={4} placeholder="Condiciones marco, NDA, cuentas bancarias, etc." onBlur={(e) => update({ contract_notes: e.target.value || null })} />
        <Textarea defaultValue={c.notes ?? ""} rows={3} placeholder="Notas internas" onBlur={(e) => update({ notes: e.target.value || null })} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Histórico de producciones</h2>
        {historyQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !historyQ.data?.length ? (
          <p className="text-sm text-muted-foreground">Aún no hay producciones registradas con esta productora.</p>
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