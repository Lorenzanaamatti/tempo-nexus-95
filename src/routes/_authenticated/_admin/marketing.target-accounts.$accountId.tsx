import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  TARGET_ACCOUNT_STATUSES,
  TARGET_ACCOUNT_STATUS_LABEL,
  TARGET_ACCOUNT_STATUS_TONE,
  TARGET_ACCOUNT_PRIORITIES,
  TARGET_ACCOUNT_PRIORITY_LABEL,
  type TargetAccountStatus,
  type TargetAccountPriority,
} from "@/lib/target-accounts-constants";

export const Route = createFileRoute("/_authenticated/_admin/marketing/target-accounts/$accountId")({
  component: TargetAccountDetail,
});

type Account = {
  id: string;
  name: string;
  production_company_id: string | null;
  status: TargetAccountStatus;
  priority: TargetAccountPriority;
  responsible_person_id: string | null;
  next_step: string | null;
  next_step_date: string | null;
  last_contact_date: string | null;
  decks_sent: number;
  sector: string | null;
  website: string | null;
  notes: string | null;
};

function TargetAccountDetail() {
  const { accountId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["target-account", accountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("target_accounts")
        .select("*")
        .eq("id", accountId)
        .single();
      if (error) throw error;
      return data as Account;
    },
  });

  const companiesQ = useQuery({
    queryKey: ["production-companies-mini"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_companies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const peopleICQ = useQuery({
    queryKey: ["people-ic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ic_team")
        .select("id, full_name")
        .eq("role", "ic_team")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState<Account | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingOpp, setCreatingOpp] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(data);
      setDirty(false);
    }
  }, [data]);

  function update<K extends keyof Account>(key: K, value: Account[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("target_accounts")
      .update({
        name: form.name,
        production_company_id: form.production_company_id,
        status: form.status,
        priority: form.priority,
        responsible_person_id: form.responsible_person_id,
        next_step: form.next_step,
        next_step_date: form.next_step_date,
        last_contact_date: form.last_contact_date,
        decks_sent: form.decks_sent ?? 0,
        sector: form.sector,
        website: form.website,
        notes: form.notes,
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDirty(false);
    toast.success("Cuenta guardada");
    qc.invalidateQueries({ queryKey: ["target-account", accountId] });
    qc.invalidateQueries({ queryKey: ["target-accounts"] });
  }

  async function remove() {
    if (!confirm("¿Eliminar definitivamente esta cuenta objetivo?")) return;
    const { error } = await (supabase as any).from("target_accounts").delete().eq("id", accountId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cuenta eliminada");
    qc.invalidateQueries({ queryKey: ["target-accounts"] });
    navigate({ to: "/marketing/target-accounts" });
  }

  async function createOpportunity() {
    if (!form) return;
    setCreatingOpp(true);
    const notesParts: string[] = [];
    if (form.sector) notesParts.push(`Sector: ${form.sector}`);
    notesParts.push(`Origen: cuenta objetivo "${form.name}"`);
    if (form.notes) notesParts.push("", form.notes);
    const { data: created, error } = await (supabase as any)
      .from("opportunities")
      .insert({
        title: form.name,
        partner_name: form.name,
        partner_company_id: form.production_company_id,
        responsible_person_id: form.responsible_person_id,
        notes: notesParts.join("\n"),
        detected_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    setCreatingOpp(false);
    if (error || !created) {
      toast.error(error?.message ?? "No se pudo crear la oportunidad");
      return;
    }
    toast.success("Oportunidad creada desde esta cuenta");
    qc.invalidateQueries({ queryKey: ["opportunities"] });
    navigate({ to: "/opportunities/$opportunityId", params: { opportunityId: created.id } });
  }

  if (isLoading || !form) {
    return <div className="mx-auto max-w-4xl px-6 py-10 font-display text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/marketing/target-accounts"><ArrowLeft className="mr-1 h-4 w-4" /> Cuentas objetivo</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={createOpportunity} disabled={creatingOpp}>
            <Sparkles className="mr-1 h-4 w-4" />
            {creatingOpp ? "Creando…" : "Crear oportunidad desde esta cuenta"}
          </Button>
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-1 h-4 w-4" /> Eliminar
          </Button>
        </div>
      </div>

      <div className="mb-6 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Marketing y Ventas · Cuenta objetivo</p>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-display text-4xl">{form.name || "Sin nombre"}</h1>
          <Badge variant="outline" className={`rounded-sm ${TARGET_ACCOUNT_STATUS_TONE[form.status]}`}>
            {TARGET_ACCOUNT_STATUS_LABEL[form.status]}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Nombre">
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field label="Empresa asociada (productora)">
          <Select
            value={form.production_company_id ?? "none"}
            onValueChange={(v) => update("production_company_id", v === "none" ? null : v)}
          >
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Sin vincular —</SelectItem>
              {(companiesQ.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={form.status} onValueChange={(v) => update("status", v as TargetAccountStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TARGET_ACCOUNT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{TARGET_ACCOUNT_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Prioridad">
          <Select value={form.priority} onValueChange={(v) => update("priority", v as TargetAccountPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TARGET_ACCOUNT_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{TARGET_ACCOUNT_PRIORITY_LABEL[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Responsable IC">
          <Select
            value={form.responsible_person_id ?? "none"}
            onValueChange={(v) => update("responsible_person_id", v === "none" ? null : v)}
          >
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Sin asignar —</SelectItem>
              {(peopleICQ.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Sector">
          <Input value={form.sector ?? ""} onChange={(e) => update("sector", e.target.value || null)} placeholder="p. ej. Plataforma, Publicidad, Cine independiente…" />
        </Field>
        <Field label="Web">
          <Input value={form.website ?? ""} onChange={(e) => update("website", e.target.value || null)} placeholder="https://…" />
        </Field>
        <Field label="Decks enviados">
          <Input type="number" min={0} value={form.decks_sent ?? 0} onChange={(e) => update("decks_sent", Math.max(0, Number(e.target.value) || 0))} />
        </Field>
        <Field label="Último contacto">
          <Input type="date" value={form.last_contact_date ?? ""} onChange={(e) => update("last_contact_date", e.target.value || null)} />
        </Field>
        <Field label="Fecha del próximo paso">
          <Input type="date" value={form.next_step_date ?? ""} onChange={(e) => update("next_step_date", e.target.value || null)} />
        </Field>
        <Field label="Próximo paso" className="md:col-span-2">
          <Textarea
            rows={2}
            value={form.next_step ?? ""}
            onChange={(e) => update("next_step", e.target.value || null)}
            placeholder="p. ej. Enviar deck corto a María García antes del 15/06"
          />
        </Field>
        <Field label="Notas internas" className="md:col-span-2">
          <Textarea
            rows={5}
            value={form.notes ?? ""}
            onChange={(e) => update("notes", e.target.value || null)}
            placeholder="Histórico de contactos, contextos, decisores…"
          />
        </Field>
      </div>

      <div className="sticky bottom-6 mt-10 flex justify-end">
        <Button onClick={save} disabled={saving || !dirty} size="lg" className="shadow-lg">
          {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="smallcaps mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}