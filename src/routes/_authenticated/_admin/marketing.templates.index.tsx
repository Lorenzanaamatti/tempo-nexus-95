import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Mail, Trash2, Copy } from "lucide-react";
import {
  OUTREACH_TEMPLATE_KINDS,
  OUTREACH_TEMPLATE_KIND_LABEL,
  MARKETING_LANGUAGES,
  MARKETING_LANGUAGE_LABEL,
  type OutreachTemplateKind,
  type MarketingLanguage,
} from "@/lib/marketing-constants";

export const Route = createFileRoute("/_authenticated/_admin/marketing/templates/")({
  component: TemplatesIndex,
});

type Template = {
  id: string;
  title: string;
  kind: OutreachTemplateKind;
  language: MarketingLanguage;
  subject: string | null;
  body_md: string | null;
  variables: string[];
  notes: string | null;
};

function TemplatesIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [editing, setEditing] = useState<Template | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["outreach-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("outreach_templates").select("*").order("kind").order("title");
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((t) => {
      if (kindFilter !== "all" && t.kind !== kindFilter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = [t.title, t.subject, t.body_md].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, kindFilter]);

  async function createTemplate() {
    const title = prompt("Nombre de la plantilla:");
    if (!title?.trim()) return;
    const { data: created, error } = await (supabase as any).from("outreach_templates").insert({ title: title.trim() }).select("*").single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["outreach-templates"] });
    setEditing(created as Template);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Marketing y Ventas</p>
          <h1 className="mt-1 font-display text-5xl">Plantillas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Emails de cold outreach, follow-ups, propuestas económicas y NDAs. Usa variables como {"{cliente}"} o {"{compositor}"} para personalizar.
          </p>
        </div>
        <Button size="sm" onClick={createTemplate}><Plus className="mr-1 h-4 w-4" /> Nueva plantilla</Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar título, asunto, cuerpo…" className="w-72 rounded-sm" />
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-56 rounded-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {OUTREACH_TEMPLATE_KINDS.map((k) => <SelectItem key={k} value={k}>{OUTREACH_TEMPLATE_KIND_LABEL[k]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando plantillas…</p>
      ) : !filtered.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <Mail className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-2xl">Aún no hay plantillas.</p>
          <p className="mt-2 text-sm text-muted-foreground">Crea la primera para empezar a estandarizar la comunicación comercial.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => (
            <li key={t.id}>
              <button onClick={() => setEditing(t)} className="glass-panel block w-full rounded-sm border border-border p-4 text-left transition hover:border-primary/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-sm text-[10px]">{OUTREACH_TEMPLATE_KIND_LABEL[t.kind]}</Badge>
                      <span className="text-[11px] text-muted-foreground">{MARKETING_LANGUAGE_LABEL[t.language]}</span>
                    </div>
                    <h3 className="mt-1 font-display text-xl">{t.title}</h3>
                    {t.subject && <p className="mt-1 text-sm text-foreground/80">Asunto: {t.subject}</p>}
                  </div>
                  {t.body_md && (
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); copyToClipboard(`${t.subject ? "Asunto: " + t.subject + "\n\n" : ""}${t.body_md}`); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <TemplateSheet item={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function TemplateSheet({ item, onClose }: { item: Template | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Template | null>(item);
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(item), [item]);

  if (!item || !f) return <Sheet open={false} onOpenChange={(o) => { if (!o) onClose(); }}><SheetContent /></Sheet>;

  function up<K extends keyof Template>(k: K, v: Template[K]) { setF((p) => p ? { ...p, [k]: v } : p); }

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("outreach_templates").update({
      title: f!.title, kind: f!.kind, language: f!.language,
      subject: f!.subject, body_md: f!.body_md, variables: f!.variables ?? [], notes: f!.notes,
    }).eq("id", f!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Plantilla guardada");
    qc.invalidateQueries({ queryKey: ["outreach-templates"] });
    onClose();
  }

  async function remove() {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    const { error } = await (supabase as any).from("outreach_templates").delete().eq("id", f!.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminada");
    qc.invalidateQueries({ queryKey: ["outreach-templates"] });
    onClose();
  }

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Editar plantilla</SheetTitle>
          <SheetDescription>Define el asunto, el cuerpo (markdown) y las variables disponibles.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Field label="Título"><Input value={f.title} onChange={(e) => up("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select value={f.kind} onValueChange={(v) => up("kind", v as OutreachTemplateKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OUTREACH_TEMPLATE_KINDS.map((k) => <SelectItem key={k} value={k}>{OUTREACH_TEMPLATE_KIND_LABEL[k]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Idioma">
              <Select value={f.language} onValueChange={(v) => up("language", v as MarketingLanguage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MARKETING_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{MARKETING_LANGUAGE_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Asunto"><Input value={f.subject ?? ""} onChange={(e) => up("subject", e.target.value || null)} /></Field>
          <Field label="Cuerpo (Markdown)">
            <Textarea rows={14} value={f.body_md ?? ""} onChange={(e) => up("body_md", e.target.value || null)} placeholder="Hola {cliente},&#10;&#10;Te escribo desde Interesante Compañía…" />
          </Field>
          <Field label="Variables disponibles (coma)">
            <Input value={(f.variables ?? []).join(", ")} onChange={(e) => up("variables", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="cliente, compositor, proyecto" />
          </Field>
          <Field label="Notas internas"><Textarea rows={2} value={f.notes ?? ""} onChange={(e) => up("notes", e.target.value || null)} /></Field>
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-4 w-4" /> Eliminar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="smallcaps mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}