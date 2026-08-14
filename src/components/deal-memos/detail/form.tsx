import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { formatMoneyEs } from "@/lib/deal-memo-constants";
import { FormSection, Field, CrmEntitySelect, PersonSelect, ImporteInput } from "./fields";

export function DealMemoForm({ dm, onSaved }: { dm: any; onSaved: () => void }) {
  const editable = dm.estado === "borrador";
  const [form, setForm] = useState({
    referencia: dm.referencia,
    obra: dm.obra,
    descripcion_uso: dm.descripcion_uso ?? "",
    cliente_id: dm.cliente_id ?? "",
    cliente_kind: (dm.cliente_kind ?? "") as "" | "composer" | "company",
    contraparte_id: dm.contraparte_id ?? "",
    contraparte_kind: (dm.contraparte_kind ?? "") as "" | "composer" | "company",
    destinatario_final_email: dm.destinatario_final_email,
    importe_propuesto: dm.importe_propuesto == null
      ? ""
      : new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(dm.importe_propuesto)),
    moneda: dm.moneda ?? "EUR",
    plantilla_id: dm.plantilla_id ?? "",
    validador_interno_id: dm.validador_interno_id ?? "",
    validador_final_id: dm.validador_final_id ?? "",
    plazo_respuesta_dias: dm.plazo_respuesta_dias ?? 7,
    notas_internas: dm.notas_internas ?? "",
  });
  const [saving, setSaving] = useState(false);

  const plantillasQ = useQuery({
    queryKey: ["dm-plantillas-min"],
    queryFn: async () => (await supabase.from("dm_plantillas").select("id, nombre, activa")).data ?? [],
  });
  const crmEntitiesQ = useQuery({
    queryKey: ["dm-crm-entities"],
    queryFn: async () => {
      const [composers, companies] = await Promise.all([
        supabase.from("composers").select("id, full_name").neq("roster_role", "ic_company").order("full_name"),
        supabase.from("production_companies").select("id, name").order("name"),
      ]);
      const items: { kind: "composer" | "company"; id: string; label: string; group: string }[] = [];
      (composers.data ?? []).forEach((c) => items.push({ kind: "composer", id: c.id, label: c.full_name, group: "Roster" }));
      (companies.data ?? []).forEach((c) => items.push({ kind: "company", id: c.id, label: c.name, group: "Productoras" }));
      return items;
    },
  });
  const validadoresQ = useQuery({
    queryKey: ["dm-validadores-people"],
    queryFn: async () => {
      const { data } = await supabase
        .from("people")
        .select("id, full_name, email")
        .eq("role", "ic_team")
        .eq("is_virtual_assistant", false)
        .order("full_name");
      return (data ?? []) as { id: string; full_name: string; email: string | null }[];
    },
  });

  async function save() {
    setSaving(true);
    const importeNum = form.importe_propuesto === ""
      ? null
      : Number(String(form.importe_propuesto).replace(/\./g, "").replace(",", "."));
    const { error } = await supabase
      .from("deal_memos")
      .update({
        referencia: form.referencia,
        obra: form.obra,
        descripcion_uso: form.descripcion_uso || null,
        cliente_id: form.cliente_id || null,
        cliente_kind: form.cliente_kind || null,
        contraparte_id: form.contraparte_id || null,
        contraparte_kind: form.contraparte_kind || null,
        destinatario_final_email: form.destinatario_final_email,
        importe_propuesto: importeNum,
        moneda: form.moneda,
        plantilla_id: form.plantilla_id || null,
        validador_interno_id: form.validador_interno_id || null,
        validador_final_id: form.validador_final_id || null,
        plazo_respuesta_dias: Number(form.plazo_respuesta_dias) || 7,
        notas_internas: form.notas_internas || null,
      })
      .eq("id", dm.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cambios guardados");
    onSaved();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6">
      {!editable && (
        <div className="flex items-center gap-2 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <Lock className="h-3.5 w-3.5" /> Editable solo en estado borrador
        </div>
      )}

      <FormSection title="Identificación">
        <Field label="Referencia"><Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} disabled={!editable} className="font-mono" /></Field>
        <Field label="Obra" className="md:col-span-2"><Input value={form.obra} onChange={(e) => setForm({ ...form, obra: e.target.value })} disabled={!editable} /></Field>
        <Field label="Descripción del uso" className="md:col-span-3"><Textarea rows={3} value={form.descripcion_uso} onChange={(e) => setForm({ ...form, descripcion_uso: e.target.value })} disabled={!editable} /></Field>
      </FormSection>

      <FormSection title="Partes">
        <Field label="Cliente">
          <CrmEntitySelect
            value={form.cliente_id ? `${form.cliente_kind}:${form.cliente_id}` : ""}
            onChange={(combo) => {
              const [kind, id] = combo.split(":") as ["composer" | "company", string];
              setForm({ ...form, cliente_kind: kind, cliente_id: id });
            }}
            items={crmEntitiesQ.data ?? []}
            disabled={!editable}
          />
        </Field>
        <Field label="Contraparte">
          <CrmEntitySelect
            value={form.contraparte_id ? `${form.contraparte_kind}:${form.contraparte_id}` : ""}
            onChange={(combo) => {
              const [kind, id] = combo.split(":") as ["composer" | "company", string];
              setForm({ ...form, contraparte_kind: kind, contraparte_id: id });
            }}
            items={crmEntitiesQ.data ?? []}
            disabled={!editable}
          />
        </Field>
        <Field label="Destinatario final (email)"><Input type="email" value={form.destinatario_final_email} onChange={(e) => setForm({ ...form, destinatario_final_email: e.target.value })} disabled={!editable} /></Field>
      </FormSection>

      <FormSection title="Económico">
        <Field label="Importe propuesto">
          <ImporteInput value={form.importe_propuesto} onChange={(v) => setForm({ ...form, importe_propuesto: v })} disabled={!editable} />
          {form.importe_propuesto !== "" && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatMoneyEs(Number(String(form.importe_propuesto).replace(/\./g, "").replace(",", ".")), form.moneda)}
            </p>
          )}
        </Field>
        <Field label="Moneda">
          <Select value={form.moneda} onValueChange={(v) => setForm({ ...form, moneda: v })} disabled={!editable}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Workflow">
        <Field label="Plantilla">
          <Select value={form.plantilla_id} onValueChange={(v) => setForm({ ...form, plantilla_id: v })} disabled={!editable}>
            <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
            <SelectContent>
              {(plantillasQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}{!p.activa ? " (inactiva)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Validador interno">
          <PersonSelect value={form.validador_interno_id} onChange={(v) => setForm({ ...form, validador_interno_id: v })} people={validadoresQ.data ?? []} disabled={!editable} />
        </Field>
        <Field label="Validador final">
          <PersonSelect value={form.validador_final_id} onChange={(v) => setForm({ ...form, validador_final_id: v })} people={validadoresQ.data ?? []} disabled={!editable} />
        </Field>
        <Field label="Plazo de respuesta (días)"><Input type="number" min={1} value={form.plazo_respuesta_dias} onChange={(e) => setForm({ ...form, plazo_respuesta_dias: Number(e.target.value) })} disabled={!editable} /></Field>
      </FormSection>

      <FormSection title="Notas internas">
        <Field label="" className="md:col-span-3"><Textarea rows={5} value={form.notas_internas} onChange={(e) => setForm({ ...form, notas_internas: e.target.value })} disabled={!editable} /></Field>
      </FormSection>

      {editable && (
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
        </div>
      )}
    </form>
  );
}
