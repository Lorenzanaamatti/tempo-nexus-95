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
import { Plus, FileText, ExternalLink, Trash2, Upload, Download, X } from "lucide-react";
import {
  DECK_PURPOSES,
  DECK_PURPOSE_LABEL,
  DECK_PURPOSE_TONE,
  MARKETING_LANGUAGES,
  MARKETING_LANGUAGE_LABEL,
  fmtDate,
  type DeckPurpose,
  type MarketingLanguage,
} from "@/lib/marketing-constants";
import { uploadMarketingAsset, signMarketingAsset, deleteMarketingAsset } from "@/lib/marketing-upload";

export const Route = createFileRoute("/_authenticated/_admin/marketing/decks/")({
  component: DecksIndex,
});

type Deck = {
  id: string;
  title: string;
  purpose: DeckPurpose;
  audience: string | null;
  language: MarketingLanguage;
  version: string | null;
  storage_path: string | null;
  external_url: string | null;
  public_link: string | null;
  notes: string | null;
  tags: string[];
  updated_at: string;
};

type DeckFile = {
  id: string;
  deck_id: string;
  storage_path: string;
  file_name: string | null;
  created_at: string;
};

function DecksIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Deck | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-decks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_decks")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Deck[];
    },
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((d) => {
      if (purposeFilter !== "all" && d.purpose !== purposeFilter) return false;
      if (langFilter !== "all" && d.language !== langFilter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = [d.title, d.audience, d.notes, (d.tags ?? []).join(" ")].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, purposeFilter, langFilter]);

  async function createDeck() {
    const title = prompt("Título del nuevo deck:");
    if (!title?.trim()) return;
    const { data: created, error } = await (supabase as any)
      .from("marketing_decks")
      .insert({ title: title.trim() })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["marketing-decks"] });
    setEditing(created as Deck);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Marketing y Ventas</p>
          <h1 className="mt-1 font-display text-5xl">Decks de venta</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Repositorio de presentaciones comerciales. Por propósito, idioma y versión, con archivo o enlace público.
          </p>
        </div>
        <Button size="sm" onClick={createDeck}><Plus className="mr-1 h-4 w-4" /> Nuevo deck</Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar título, audiencia, etiqueta…" className="w-72 rounded-sm" />
        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
          <SelectTrigger className="w-56 rounded-sm"><SelectValue placeholder="Propósito" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los propósitos</SelectItem>
            {DECK_PURPOSES.map((p) => <SelectItem key={p} value={p}>{DECK_PURPOSE_LABEL[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="w-40 rounded-sm"><SelectValue placeholder="Idioma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los idiomas</SelectItem>
            {MARKETING_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{MARKETING_LANGUAGE_LABEL[l]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando decks…</p>
      ) : !filtered.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-2xl">Aún no hay decks.</p>
          <p className="mt-2 text-sm text-muted-foreground">Crea el primero para empezar a organizar el material comercial.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => setEditing(d)}
              className="glass-panel group flex flex-col gap-2 rounded-sm border border-border p-4 text-left transition hover:border-primary/60"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl leading-tight">{d.title}</h3>
                <Badge variant="outline" className={`shrink-0 rounded-sm text-[10px] ${DECK_PURPOSE_TONE[d.purpose]}`}>
                  {DECK_PURPOSE_LABEL[d.purpose]}
                </Badge>
              </div>
              {d.audience && <p className="text-xs text-muted-foreground">Audiencia: {d.audience}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{MARKETING_LANGUAGE_LABEL[d.language]}</span>
                {d.version && <span>· v{d.version}</span>}
                <span>· {fmtDate(d.updated_at)}</span>
              </div>
              {(d.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {d.tags.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex items-center gap-2 pt-2 text-xs">
                {d.storage_path && <span className="inline-flex items-center gap-1 text-emerald-400"><Download className="h-3 w-3" /> Archivo</span>}
                {d.external_url && <span className="inline-flex items-center gap-1 text-indigo-300"><ExternalLink className="h-3 w-3" /> Externo</span>}
                {d.public_link && <span className="inline-flex items-center gap-1 text-amber-300"><ExternalLink className="h-3 w-3" /> Público</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <DeckSheet deck={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function DeckSheet({ deck, onClose }: { deck: Deck | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Deck | null>(deck);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setForm(deck); }, [deck]);

  if (!deck || !form) {
    return (
      <Sheet open={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent />
      </Sheet>
    );
  }

  function update<K extends keyof Deck>(k: K, v: Deck[K]) {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("marketing_decks")
      .update({
        title: form.title,
        purpose: form.purpose,
        audience: form.audience,
        language: form.language,
        version: form.version,
        external_url: form.external_url,
        public_link: form.public_link,
        notes: form.notes,
        tags: form.tags ?? [],
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Deck guardado");
    qc.invalidateQueries({ queryKey: ["marketing-decks"] });
    onClose();
  }

  async function remove() {
    if (!form) return;
    if (!confirm("¿Eliminar este deck?")) return;
    if (form.storage_path) await deleteMarketingAsset(form.storage_path).catch(() => {});
    const { error } = await (supabase as any).from("marketing_decks").delete().eq("id", form.id);
    if (error) return toast.error(error.message);
    toast.success("Deck eliminado");
    qc.invalidateQueries({ queryKey: ["marketing-decks"] });
    onClose();
  }

  async function onFile(file: File) {
    setUploading(true);
    try {
      if (form?.storage_path) await deleteMarketingAsset(form.storage_path).catch(() => {});
      const path = await uploadMarketingAsset("decks", file);
      const { error } = await (supabase as any).from("marketing_decks").update({ storage_path: path }).eq("id", form!.id);
      if (error) throw error;
      update("storage_path", path);
      toast.success("Archivo subido");
    } catch (e: any) {
      toast.error(e.message ?? "Error subiendo archivo");
    } finally {
      setUploading(false);
    }
  }

  async function openFile() {
    if (!form?.storage_path) return;
    const url = await signMarketingAsset(form.storage_path);
    if (url) window.open(url, "_blank");
  }

  return (
    <Sheet open={!!deck} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Editar deck</SheetTitle>
          <SheetDescription>Actualiza la ficha, sube el archivo o registra el enlace público.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Field label="Título"><Input value={form.title} onChange={(e) => update("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Propósito">
              <Select value={form.purpose} onValueChange={(v) => update("purpose", v as DeckPurpose)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DECK_PURPOSES.map((p) => <SelectItem key={p} value={p}>{DECK_PURPOSE_LABEL[p]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Idioma">
              <Select value={form.language} onValueChange={(v) => update("language", v as MarketingLanguage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MARKETING_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{MARKETING_LANGUAGE_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Audiencia"><Input value={form.audience ?? ""} onChange={(e) => update("audience", e.target.value || null)} placeholder="p. ej. Productoras de ficción" /></Field>
            <Field label="Versión"><Input value={form.version ?? ""} onChange={(e) => update("version", e.target.value || null)} placeholder="2.1" /></Field>
          </div>
          <Field label="Etiquetas (separadas por coma)">
            <Input
              value={(form.tags ?? []).join(", ")}
              onChange={(e) => update("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="cine, plataformas, EU"
            />
          </Field>

          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps mb-2 block text-xs text-muted-foreground">Archivo del deck</Label>
            {form.storage_path ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={openFile}><Download className="mr-1 h-3 w-3" /> Descargar / ver</Button>
                <span className="truncate text-xs text-muted-foreground">{form.storage_path.split("/").slice(-1)[0]}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aún no hay archivo subido.</p>
            )}
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-primary hover:underline">
              <Upload className="h-3 w-3" /> {form.storage_path ? "Reemplazar" : "Subir archivo"}
              <input type="file" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Subiendo…</p>}
          </div>

          <Field label="Enlace externo"><Input value={form.external_url ?? ""} onChange={(e) => update("external_url", e.target.value || null)} placeholder="https://…" /></Field>
          <Field label="Enlace público compartible"><Input value={form.public_link ?? ""} onChange={(e) => update("public_link", e.target.value || null)} placeholder="https://docsend.com/…" /></Field>
          <Field label="Notas"><Textarea rows={4} value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value || null)} /></Field>

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