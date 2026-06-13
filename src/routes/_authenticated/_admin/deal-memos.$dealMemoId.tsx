import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Sparkles, RefreshCw, Loader2, MoreHorizontal,
  Copy, Ban, Download, Lock, Mail, Send, FileText, Clock, Pencil, Save,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatDateEs } from "@/lib/dates";
import { ESTADO_LABEL, EVENTO_LABEL, formatMoneyEs, buildNextReference, type DealMemoEstado } from "@/lib/deal-memo-constants";
import { EstadoBadge } from "@/components/deal-memos/estado-badge";
import { generateDealMemoVersion } from "@/lib/deal-memos.functions";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/$dealMemoId")({
  component: DealMemoDetail,
});

function DealMemoDetail() {
  const { dealMemoId } = Route.useParams();
  const qc = useQueryClient();

  const dmQ = useQuery({
    queryKey: ["deal-memo", dealMemoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_memos")
        .select("*, plantilla:plantilla_id(id, nombre, activa)")
        .eq("id", dealMemoId)
        .single();
      if (error) throw error;
      const dm: any = data;
      // Resolver nombres de cliente/contraparte/validadores (ya no son FKs)
      const [cliente, contraparte, vi, vf] = await Promise.all([
        resolveEntity(dm.cliente_kind, dm.cliente_id),
        resolveEntity(dm.contraparte_kind, dm.contraparte_id),
        dm.validador_interno_id ? supabase.from("people").select("id, full_name, email").eq("id", dm.validador_interno_id).maybeSingle().then((r) => r.data) : null,
        dm.validador_final_id ? supabase.from("people").select("id, full_name, email").eq("id", dm.validador_final_id).maybeSingle().then((r) => r.data) : null,
      ]);
      dm.cliente = cliente;
      dm.contraparte = contraparte;
      dm.validador_interno = vi ? { id: vi.id, nombre: vi.full_name } : null;
      dm.validador_final = vf ? { id: vf.id, nombre: vf.full_name } : null;
      return dm;
    },
  });

  if (dmQ.isLoading) return <div className="mx-auto max-w-[1100px] px-6 py-8"><Skeleton className="h-[400px]" /></div>;
  if (dmQ.error || !dmQ.data) return <p className="p-10 text-rose-600">No se pudo cargar el deal memo</p>;

  const dm = dmQ.data;
  return <DealMemoView dm={dm} onChange={() => qc.invalidateQueries({ queryKey: ["deal-memo", dealMemoId] })} />;
}

function DealMemoView({ dm, onChange }: { dm: any; onChange: () => void }) {
  return (
    <div>
      <DealMemoHeader dm={dm} onChange={onChange} />
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <Tabs defaultValue="datos">
          <TabsList>
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="versiones">Versiones</TabsTrigger>
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>
          <TabsContent value="datos" className="pt-4"><DealMemoForm dm={dm} onSaved={onChange} /></TabsContent>
          <TabsContent value="versiones" className="pt-4"><DealMemoVersions dm={dm} onChange={onChange} /></TabsContent>
          <TabsContent value="log" className="pt-4"><DealMemoLog dealMemoId={dm.id} /></TabsContent>
          <TabsContent value="notas" className="pt-4"><DealMemoNotas dm={dm} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

async function resolveEntity(kind: string | null, id: string | null): Promise<{ id: string; nombre: string } | null> {
  if (!id || !kind) return null;
  if (kind === "composer") {
    const { data } = await supabase.from("composers").select("id, full_name").eq("id", id).maybeSingle();
    return data ? { id: data.id, nombre: data.full_name } : null;
  }
  if (kind === "company") {
    const { data } = await supabase.from("production_companies").select("id, name").eq("id", id).maybeSingle();
    return data ? { id: data.id, nombre: data.name } : null;
  }
  return null;
}


function DealMemoHeader({ dm, onChange }: { dm: any; onChange: () => void }) {
  const qc = useQueryClient();
  const generate = useServerFn(generateDealMemoVersion);
  const [busy, setBusy] = useState(false);

  const allRefsQ = useQuery({
    queryKey: ["dm-refs-min"],
    queryFn: async () => ((await supabase.from("deal_memos").select("referencia")).data ?? []).map((r) => r.referencia as string),
  });

  async function duplicate() {
    const refs = allRefsQ.data ?? [];
    const next = buildNextReference(refs);
    const { data: ins, error } = await supabase.from("deal_memos").insert({
      referencia: next,
      obra: dm.obra + " (copia)",
      descripcion_uso: dm.descripcion_uso,
      cliente_id: dm.cliente_id,
      contraparte_id: dm.contraparte_id,
      importe_propuesto: dm.importe_propuesto,
      moneda: dm.moneda,
      plantilla_id: dm.plantilla_id,
      validador_interno_id: dm.validador_interno_id,
      validador_final_id: dm.validador_final_id,
      destinatario_final_email: dm.destinatario_final_email,
      plazo_respuesta_dias: dm.plazo_respuesta_dias,
      notas_internas: dm.notas_internas,
    }).select("id").single();
    if (error || !ins) return toast.error(error?.message ?? "Error");
    await supabase.from("deal_memo_eventos").insert({ deal_memo_id: ins.id, tipo_evento: "creado", payload: { duplicado_de: dm.id } });
    toast.success(`Duplicado como ${next}`);
  }

  async function cancelDm() {
    if (!confirm("¿Cancelar este deal memo?")) return;
    const { error } = await supabase.from("deal_memos").update({ estado: "cancelado" }).eq("id", dm.id);
    if (error) return toast.error(error.message);
    await supabase.from("deal_memo_eventos").insert({ deal_memo_id: dm.id, tipo_evento: "cerrado", payload: { motivo: "cancelado_desde_ficha" } });
    toast.success("Cancelado");
    onChange();
  }

  async function aiGenerate() {
    if (!dm.plantilla_id) return toast.error("Asigna una plantilla primero");
    setBusy(true);
    try {
      await generate({ data: { dealMemoId: dm.id } });
      toast.success("Versión generada");
      qc.invalidateQueries({ queryKey: ["dm-versions", dm.id] });
      qc.invalidateQueries({ queryKey: ["dm-events", dm.id] });
      onChange();
    } catch (e: any) { toast.error(e?.message ?? "Error generando"); }
    finally { setBusy(false); }
  }

  const estado = dm.estado as DealMemoEstado;

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-[1100px] px-6 py-4">
        <nav className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/deal-memos" className="hover:text-foreground">Dashboard</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/deal-memos/lista" className="hover:text-foreground">Deal Memos</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-mono text-foreground">{dm.referencia}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl">{dm.obra}</h2>
              <EstadoBadge estado={estado} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{dm.referencia}</span>
              <span className="mx-2">·</span>
              {dm.cliente?.nombre ?? "Sin cliente"}
              <ArrowRight className="mx-1 inline h-3 w-3" />
              {dm.contraparte?.nombre ?? "Sin contraparte"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ContextualActions dm={dm} busy={busy} onAiGenerate={aiGenerate} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={duplicate}><Copy className="mr-2 h-4 w-4" />Duplicar</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast("Función disponible en Bloque 5")}><Download className="mr-2 h-4 w-4" />Exportar log</DropdownMenuItem>
                <DropdownMenuItem onSelect={cancelDm} className="text-rose-600"><Ban className="mr-2 h-4 w-4" />Cancelar deal memo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextualActions({ dm, busy, onAiGenerate }: { dm: any; busy: boolean; onAiGenerate: () => void }) {
  const estado = dm.estado as DealMemoEstado;
  if (estado === "borrador") {
    return (
      <Button onClick={onAiGenerate} disabled={busy} size="sm">
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
        Generar draft con IA
      </Button>
    );
  }
  if (estado === "generando") {
    return <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Generando…</span>;
  }
  if (estado === "revision_interna") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">⏳ Esperando revisión de {dm.validador_interno?.nombre ?? "—"}</span>
        <Button variant="outline" size="sm" onClick={() => toast("Función disponible en Bloque 6")}><Mail className="mr-1 h-4 w-4" />Reenviar email</Button>
      </div>
    );
  }
  if (estado === "corrigiendo") {
    return <Button size="sm" onClick={onAiGenerate} disabled={busy}><RefreshCw className="mr-1 h-4 w-4" />Generar nueva versión</Button>;
  }
  if (estado === "revision_final") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">⏳ Esperando aprobación de {dm.validador_final?.nombre ?? "—"}</span>
        <Button variant="outline" size="sm" onClick={() => toast("Función disponible en Bloque 6")}><Mail className="mr-1 h-4 w-4" />Reenviar email</Button>
      </div>
    );
  }
  if (estado === "enviado") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Enviado el {formatDateEs(dm.fecha_envio)} · Plazo: {formatDateEs(dm.fecha_limite_respuesta)}
        </span>
        <Button variant="outline" size="sm" onClick={() => toast("Función disponible en Bloque 6")}><Send className="mr-1 h-4 w-4" />Enviar reminder</Button>
      </div>
    );
  }
  if (estado === "respondido") {
    return <Button size="sm" onClick={() => toast("Función disponible en Bloque 5")}><Sparkles className="mr-1 h-4 w-4" />Procesar respuesta con IA</Button>;
  }
  return null;
}

function DealMemoForm({ dm, onSaved }: { dm: any; onSaved: () => void }) {
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
        supabase.from("composers").select("id, full_name").order("full_name"),
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
        .from("person_ic_functions")
        .select("person_id, people:person_id(id, full_name, email)")
        .eq("function", "validacion_contratos_deal_memos");
      const seen = new Set<string>();
      const out: { id: string; full_name: string; email: string | null }[] = [];
      for (const row of (data ?? []) as any[]) {
        const p = row.people;
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          out.push(p);
        }
      }
      out.sort((a, b) => a.full_name.localeCompare(b.full_name));
      return out;
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
          <ImporteInput
            value={form.importe_propuesto}
            onChange={(v) => setForm({ ...form, importe_propuesto: v })}
            disabled={!editable}
          />
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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-border bg-card p-4">
      <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{children}</div>
    </section>
  );
}
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <Label className="mb-1 text-xs text-muted-foreground">{label}</Label>}
      {children}
    </div>
  );
}
function ContactoSelect({ value, onChange, contactos, disabled }: {
  value: string; onChange: (v: string) => void;
  contactos: { id: string; nombre: string; empresa: string | null }[]; disabled?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
      <SelectContent>
        {contactos.length === 0 && <SelectItem value="__none" disabled>Sin contactos</SelectItem>}
        {contactos.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nombre}{c.empresa ? ` · ${c.empresa}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CrmEntitySelect({ value, onChange, items, disabled }: {
  value: string;
  onChange: (combo: string) => void;
  items: { kind: "composer" | "company"; id: string; label: string; group: string }[];
  disabled?: boolean;
}) {
  const groups = ["Roster", "Productoras"];
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Selecciona del CRM…" /></SelectTrigger>
      <SelectContent>
        {items.length === 0 && <SelectItem value="__none" disabled>Sin entidades en el CRM</SelectItem>}
        {groups.map((g) => {
          const sub = items.filter((i) => i.group === g);
          if (sub.length === 0) return null;
          return (
            <SelectGroup key={g}>
              <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{g}</SelectLabel>
              {sub.map((i) => (
                <SelectItem key={`${i.kind}:${i.id}`} value={`${i.kind}:${i.id}`}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function PersonSelect({ value, onChange, people, disabled }: {
  value: string; onChange: (v: string) => void;
  people: { id: string; full_name: string; email: string | null }[]; disabled?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
      <SelectContent>
        {people.length === 0 && <SelectItem value="__none" disabled>Sin personas con rol validador</SelectItem>}
        {people.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.full_name}{p.email ? ` · ${p.email}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ImporteInput({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  // Permite dígitos, puntos (miles) y una coma decimal — formato es-ES.
  return (
    <Input
      inputMode="decimal"
      value={value}
      placeholder="0,00"
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.,]/g, "");
        onChange(raw);
      }}
      onBlur={() => {
        if (value === "") return;
        const n = Number(value.replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(n)) {
          onChange(
            new Intl.NumberFormat("es-ES", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }).format(n),
          );
        }
      }}
    />
  );
}

function DealMemoVersions({ dm, onChange }: { dm: any; onChange: () => void }) {
  const qc = useQueryClient();
  const generate = useServerFn(generateDealMemoVersion);
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modalVersion, setModalVersion] = useState<any | null>(null);

  const versionsQ = useQuery({
    queryKey: ["dm-versions", dm.id],
    queryFn: async () => ((await supabase.from("deal_memo_versiones").select("*").eq("deal_memo_id", dm.id).order("numero_version", { ascending: false })).data ?? []),
  });

  async function regenerate(isCorrection: boolean) {
    if (!dm.plantilla_id) return toast.error("Asigna una plantilla primero");
    if (isCorrection && !comments.trim()) return toast.error("Escribe las correcciones");
    setBusy(true);
    try {
      await generate({ data: { dealMemoId: dm.id, correctionComments: isCorrection ? comments : undefined } });
      toast.success("Nueva versión generada");
      setComments("");
      qc.invalidateQueries({ queryKey: ["dm-versions", dm.id] });
      qc.invalidateQueries({ queryKey: ["dm-events", dm.id] });
      onChange();
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
    finally { setBusy(false); }
  }

  const versions = versionsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border bg-card p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Generación con IA</h3>
        {!dm.plantilla_id ? (
          <p className="text-sm text-amber-600">Asigna una plantilla en la pestaña Datos para generar versiones.</p>
        ) : versions.length === 0 ? (
          <Button onClick={() => regenerate(false)} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Generar primera versión
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Correcciones para la siguiente versión…" />
            <div className="flex gap-2">
              <Button onClick={() => regenerate(false)} disabled={busy} variant="outline" size="sm"><RefreshCw className="mr-1 h-4 w-4" />Regenerar</Button>
              <Button onClick={() => regenerate(true)} disabled={busy || !comments.trim()} size="sm"><Sparkles className="mr-1 h-4 w-4" />Pedir correcciones</Button>
            </div>
          </div>
        )}
      </div>

      {versionsQ.isLoading ? <Skeleton className="h-32" /> :
       versions.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Aún no hay versiones generadas
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v: any) => {
            const open = openId === v.id;
            return (
              <div key={v.id} className="rounded-sm border border-border bg-card">
                <button onClick={() => setOpenId(open ? null : v.id)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="rounded-sm bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider text-background">v{v.numero_version}</span>
                    <span className="text-sm font-medium">{v.email_asunto}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{v.generada_por === "agente_ia" ? "IA" : "Corrección humana"} · {formatDistanceToNow(new Date(v.created_at), { locale: es, addSuffix: true })}</span>
                </button>
                {open && (
                  <div className="border-t border-border px-4 py-3">
                    {v.comentarios_revision && (
                      <p className="mb-3 rounded-sm border-l-2 border-amber-500 bg-amber-500/10 px-3 py-2 text-xs italic">
                        Correcciones aplicadas: {v.comentarios_revision}
                      </p>
                    )}
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{v.email_cuerpo}</pre>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setModalVersion({ ...v, _editing: false })}>Ver completo</Button>
                      <Button size="sm" variant="outline" onClick={() => setModalVersion({ ...v, _editing: true })}><Pencil className="mr-1 h-4 w-4" />Editar y guardar como nueva versión</Button>
                      <Button size="sm" variant="outline" onClick={() => toast("Función disponible en Bloque 5")}><Download className="mr-1 h-4 w-4" />Descargar .docx</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <VersionModal
        version={modalVersion}
        onClose={() => setModalVersion(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["dm-versions", dm.id] });
          qc.invalidateQueries({ queryKey: ["dm-events", dm.id] });
          setModalVersion(null);
        }}
        dealMemoId={dm.id}
      />
    </div>
  );
}

function VersionModal({ version, onClose, onSaved, dealMemoId }: { version: any; onClose: () => void; onSaved: () => void; dealMemoId: string }) {
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (version) {
      setAsunto(version.email_asunto ?? "");
      setCuerpo(version.email_cuerpo ?? "");
      setEditing(!!version._editing);
    }
  }, [version]);

  async function save() {
    if (!asunto.trim() || !cuerpo.trim()) return toast.error("Asunto y cuerpo son obligatorios");
    setSaving(true);
    try {
      const { data: maxRow } = await supabase
        .from("deal_memo_versiones")
        .select("numero_version")
        .eq("deal_memo_id", dealMemoId)
        .order("numero_version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNumber = (maxRow?.numero_version ?? 0) + 1;
      const { error } = await supabase.from("deal_memo_versiones").insert({
        deal_memo_id: dealMemoId,
        numero_version: nextNumber,
        email_asunto: asunto,
        email_cuerpo: cuerpo,
        generada_por: "humano",
        comentarios_revision: `Editado manualmente sobre v${version.numero_version}`,
      });
      if (error) throw error;
      toast.success(`Versión v${nextNumber} guardada`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!version} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Versión {version?.numero_version} {editing && <span className="ml-2 text-xs font-normal text-muted-foreground">(editando — se guardará como nueva versión)</span>}
          </DialogTitle>
        </DialogHeader>
        {version && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Asunto</p>
              {editing ? (
                <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} className="mt-1" />
              ) : (
                <p className="text-sm font-medium">{version.email_asunto}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cuerpo</p>
              {editing ? (
                <Textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={20} className="mt-1 font-sans text-sm leading-relaxed" />
              ) : (
                <pre className="mt-1 max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-sm border border-border bg-muted/30 p-3 font-sans text-sm leading-relaxed">{version.email_cuerpo}</pre>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancelar edición</Button>
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Guardar como v{(version.numero_version ?? 0) + 1}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DealMemoLog({ dealMemoId }: { dealMemoId: string }) {
  const q = useQuery({
    queryKey: ["dm-events", dealMemoId],
    queryFn: async () => ((await supabase.from("deal_memo_eventos").select("*").eq("deal_memo_id", dealMemoId).order("created_at", { ascending: false })).data ?? []),
  });
  if (q.isLoading) return <Skeleton className="h-40" />;
  const events = q.data ?? [];
  if (events.length === 0) return <div className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground"><Clock className="mx-auto mb-2 h-6 w-6 opacity-50" />Sin eventos</div>;
  return (
    <ol className="relative space-y-3 border-l border-border pl-6">
      {events.map((e: any) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[29px] mt-1.5 h-2.5 w-2.5 rounded-full bg-foreground" />
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{EVENTO_LABEL[e.tipo_evento as keyof typeof EVENTO_LABEL] ?? e.tipo_evento}</p>
              <span className="text-[10px] text-muted-foreground">{formatDateEs(e.created_at)} · {formatDistanceToNow(new Date(e.created_at), { locale: es, addSuffix: true })}</span>
            </div>
            {e.actor_email && <p className="mt-0.5 text-xs text-muted-foreground">{e.actor_email}</p>}
            {e.payload && Object.keys(e.payload).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground">Detalles</summary>
                <pre className="mt-1 overflow-x-auto rounded-sm bg-muted p-2 text-[11px]">{JSON.stringify(e.payload, null, 2)}</pre>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function DealMemoNotas({ dm }: { dm: any }) {
  const [value, setValue] = useState(dm.notas_internas ?? "");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(value);

  useEffect(() => {
    if (value === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving("saving");
      const { error } = await supabase.from("deal_memos").update({ notas_internas: value || null }).eq("id", dm.id);
      if (error) { toast.error(error.message); setSaving("idle"); return; }
      lastSaved.current = value;
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1500);
    }, 3000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, dm.id]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Las notas se autoguardan tras 3 segundos de inactividad.</p>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {saving === "saving" ? "Guardando…" : saving === "saved" ? "Guardado" : ""}
        </span>
      </div>
      <Textarea rows={14} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Notas internas del equipo…" />
    </div>
  );
}