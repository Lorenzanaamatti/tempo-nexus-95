import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_LANG_LABEL,
  CONTRACT_TYPE_SUGGESTIONS,
  type ContractStatus,
  type ContractLanguage,
} from "@/lib/contract-constants";

export const Route = createFileRoute("/_authenticated/_admin/contracts/$contractId")({
  component: ContractDetail,
});

function ContractDetail() {
  const { contractId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contracts").select("*").eq("id", contractId).single();
      if (error) throw error;
      return data;
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

  const composersQ = useQuery({
    queryKey: ["composers-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("composers").select("id, full_name, artistic_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    title: "",
    contract_type: "" as string,
    contract_type_custom: "" as string,
    signer_name: "",
    counterparty: "",
    partner_company_id: "",
    composer_id: "",
    signed_date: "",
    end_date: "",
    notice_date: "",
    sign_status: "borrador" as ContractStatus,
    language: "es" as ContractLanguage,
    url: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    const d: any = q.data;
    const known = CONTRACT_TYPE_SUGGESTIONS.includes(d.contract_type);
    setForm({
      title: d.title ?? "",
      contract_type: d.contract_type ? (known ? d.contract_type : "__custom__") : "",
      contract_type_custom: d.contract_type && !known ? d.contract_type : "",
      signer_name: d.signer_name ?? "",
      counterparty: d.counterparty ?? "",
      partner_company_id: d.partner_company_id ?? "",
      composer_id: d.composer_id ?? "",
      signed_date: d.signed_date ?? "",
      end_date: d.end_date ?? "",
      notice_date: d.notice_date ?? "",
      sign_status: d.sign_status ?? "borrador",
      language: d.language ?? "es",
      url: d.url ?? "",
      notes: d.notes ?? "",
    });
  }, [q.data]);

  async function save() {
    setSaving(true);
    const type = form.contract_type === "__custom__" ? (form.contract_type_custom.trim() || null) : (form.contract_type || null);
    const { error } = await (supabase as any).from("contracts").update({
      title: form.title,
      contract_type: type,
      signer_name: form.signer_name || null,
      counterparty: form.counterparty || null,
      partner_company_id: form.partner_company_id || null,
      composer_id: form.composer_id || null,
      signed_date: form.signed_date || null,
      end_date: form.end_date || null,
      notice_date: form.notice_date || null,
      sign_status: form.sign_status,
      language: form.language,
      url: form.url || null,
      notes: form.notes || null,
    }).eq("id", contractId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["contract", contractId] });
    qc.invalidateQueries({ queryKey: ["contracts"] });
  }

  async function remove() {
    if (!confirm("¿Eliminar este contrato?")) return;
    const { error } = await (supabase as any).from("contracts").delete().eq("id", contractId);
    if (error) return toast.error(error.message);
    navigate({ to: "/contracts" });
  }

  if (q.isLoading || !q.data) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <Link to="/contracts" className="smallcaps text-xs text-muted-foreground hover:underline">← Contratos</Link>
          <h1 className="mt-1 font-display text-4xl">{form.title || "—"}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Título</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div>
          <Label>Tipo de contrato</Label>
          <Select value={form.contract_type || undefined} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
            <SelectTrigger><SelectValue placeholder="Tipo…" /></SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPE_SUGGESTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              <SelectItem value="__custom__">Otro (especificar)</SelectItem>
            </SelectContent>
          </Select>
          {form.contract_type === "__custom__" && (
            <Input className="mt-2" value={form.contract_type_custom} onChange={(e) => setForm({ ...form, contract_type_custom: e.target.value })} placeholder="Especificar tipo" />
          )}
        </div>

        <div>
          <Label>Idioma</Label>
          <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v as ContractLanguage })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CONTRACT_LANG_LABEL) as ContractLanguage[]).map((l) => (
                <SelectItem key={l} value={l}>{CONTRACT_LANG_LABEL[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Firmante</Label>
          <Input value={form.signer_name} onChange={(e) => setForm({ ...form, signer_name: e.target.value })} placeholder="Nombre del firmante" />
        </div>
        <div>
          <Label>Contraparte (texto libre)</Label>
          <Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} placeholder="Empresa o persona" />
        </div>

        <div>
          <Label>Productora vinculada</Label>
          <Select value={form.partner_company_id || undefined} onValueChange={(v) => setForm({ ...form, partner_company_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona productora…" /></SelectTrigger>
            <SelectContent>
              {(companiesQ.data ?? []).map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Compositor / representado vinculado</Label>
          <Select value={form.composer_id || undefined} onValueChange={(v) => setForm({ ...form, composer_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona representado…" /></SelectTrigger>
            <SelectContent>
              {(composersQ.data ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.artistic_name || c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Fecha de firma</Label>
          <Input type="date" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} />
        </div>
        <div>
          <Label>Fecha de finalización</Label>
          <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
        <div>
          <Label>Fecha de preaviso</Label>
          <Input type="date" value={form.notice_date} onChange={(e) => setForm({ ...form, notice_date: e.target.value })} />
        </div>
        <div>
          <Label>Estado del proceso de firma</Label>
          <Select value={form.sign_status} onValueChange={(v) => setForm({ ...form, sign_status: v as ContractStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CONTRACT_STATUS_LABEL) as ContractStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{CONTRACT_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label>Enlace al documento</Label>
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <Label>Notas</Label>
          <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

      </section>
      <SaveButton floating onClick={save} saving={saving} />
    </div>
  );
}