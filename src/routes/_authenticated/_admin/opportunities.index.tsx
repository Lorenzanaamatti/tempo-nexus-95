import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { formatEUR } from "@/lib/money";
import { formatDateEs } from "@/lib/dates";
import { OPPORTUNITY_STATUS_LABEL, OPPORTUNITY_STATUS_TONE, type OpportunityStatus } from "@/lib/opportunity-constants";

export const Route = createFileRoute("/_authenticated/_admin/opportunities/")({
  component: OpportunitiesIndex,
});

function OpportunitiesIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState<string>("");
  const [newResponsible, setNewResponsible] = useState<string>("");
  const [newDetectedDate, setNewDetectedDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["opportunities", q],
    queryFn: async () => {
      let query = (supabase as any)
        .from("opportunities")
        .select("id, title, statuses, probability_pct, estimated_value, detected_date, expected_close_date, last_contact_date, partner_company:production_companies(name), partner_name, responsible:people(full_name), candidates:opportunity_candidates(composer:composers(full_name, artistic_name))")
        .order("created_at", { ascending: false });
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const companiesQ = useQuery({
    queryKey: ["production-companies-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_companies").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const peopleICQ = useQuery({
    queryKey: ["people-ic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("id, full_name").eq("role", "ic_team").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const { error } = await (supabase as any).from("opportunities").insert({
      title: newTitle.trim(),
      partner_company_id: newCompany || null,
      responsible_person_id: newResponsible || null,
      detected_date: newDetectedDate || null,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewTitle("");
    setNewCompany("");
    setNewResponsible("");
    setNewDetectedDate("");
    toast.success("Oportunidad creada");
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  }

  const filtered = (data ?? []).filter((o: any) =>
    statusFilter === "all" ? true : (o.statuses ?? []).includes(statusFilter),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Pipeline</p>
          <h1 className="mt-1 font-display text-5xl">OPORTUNIDADES</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Oportunidades detectadas, candidatos, estado, probabilidad y próximas acciones.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {(Object.keys(OPPORTUNITY_STATUS_LABEL) as OpportunityStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{OPPORTUNITY_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar oportunidad…" className="w-56 rounded-sm" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-4 sm:grid-cols-12">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Oportunidad detectada…" className="sm:col-span-4" />
        <div className="sm:col-span-3">
          <Select value={newCompany || undefined} onValueChange={setNewCompany}>
            <SelectTrigger><SelectValue placeholder="Productora…" /></SelectTrigger>
            <SelectContent>
              {(companiesQ.data ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Select value={newResponsible || undefined} onValueChange={setNewResponsible}>
            <SelectTrigger><SelectValue placeholder="Responsable…" /></SelectTrigger>
            <SelectContent>
              {(peopleICQ.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input type="date" value={newDetectedDate} onChange={(e) => setNewDetectedDate(e.target.value)} className="sm:col-span-2" />
        <Button onClick={create} disabled={creating} className="sm:col-span-1"><Plus className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !filtered.length ? (
        <p className="text-sm text-muted-foreground">Sin oportunidades aún.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 smallcaps text-xs">Oportunidad</th>
                <th className="px-3 py-2 smallcaps text-xs">Partner</th>
                <th className="px-3 py-2 smallcaps text-xs">Candidatos</th>
                <th className="px-3 py-2 smallcaps text-xs">Estado</th>
                <th className="px-3 py-2 smallcaps text-xs text-right">Prob.</th>
                <th className="px-3 py-2 smallcaps text-xs text-right">Valor est.</th>
                <th className="px-3 py-2 smallcaps text-xs">Detectada</th>
                <th className="px-3 py-2 smallcaps text-xs">Cierre est.</th>
                <th className="px-3 py-2 smallcaps text-xs">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o: any) => (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link to="/opportunities/$opportunityId" params={{ opportunityId: o.id }} className="font-display hover:underline">{o.title}</Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{o.partner_company?.name || o.partner_name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {(o.candidates ?? []).slice(0, 3).map((c: any) => c.composer?.artistic_name || c.composer?.full_name).filter(Boolean).join(", ") || "—"}
                    {(o.candidates?.length ?? 0) > 3 && <span className="text-xs"> +{o.candidates.length - 3}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(o.statuses ?? []).map((s: OpportunityStatus) => (
                        <span key={s} className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${OPPORTUNITY_STATUS_TONE[s]}`}>{OPPORTUNITY_STATUS_LABEL[s]}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{o.probability_pct != null ? `${o.probability_pct}%` : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEUR(o.estimated_value)}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{formatDateEs(o.detected_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{formatDateEs(o.expected_close_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{o.responsible?.full_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}