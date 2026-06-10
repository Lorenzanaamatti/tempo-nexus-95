import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/providers/")({
  component: ProvidersPage,
});

const KIND_LABEL: Record<string, string> = {
  estudio_grabacion: "Estudio de grabación",
  mezcla: "Mezcla",
  mastering: "Mastering",
  musico: "Músico",
  orquesta: "Orquesta",
  copista: "Copista",
  editor_musical: "Editor musical",
  sonido: "Sonido",
  post_produccion: "Post-producción",
  abogado: "Abogado",
  gestoria: "Gestoría",
  fotografo: "Fotógrafo",
  video: "Vídeo",
  diseno: "Diseño",
  web: "Web",
  pr_marketing: "PR / Marketing",
  otros: "Otros",
};
const KINDS = Object.keys(KIND_LABEL);

type Provider = {
  id: string;
  name: string;
  kind: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  composer_id: string | null;
  shared_with_ic: boolean;
  rate_notes: string | null;
  notes: string | null;
};

function ProvidersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Provider> | null>(null);

  const dataQ = useQuery({
    queryKey: ["providers"],
    queryFn: async () =>
      ((await (supabase as any).from("providers").select("*").order("name")).data ?? []) as Provider[],
  });

  const composersQ = useQuery({
    queryKey: ["composers-min"],
    queryFn: async () =>
      ((await supabase.from("composers").select("id, full_name, artistic_name").order("full_name")).data ?? []) as any[],
  });
  const composerName = (id: string | null) =>
    !id ? "IC (compartido)" : composersQ.data?.find((c) => c.id === id)?.artistic_name || composersQ.data?.find((c) => c.id === id)?.full_name || "—";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (dataQ.data ?? []).filter((p) => {
      if (kindFilter !== "all" && p.kind !== kindFilter) return false;
      if (scopeFilter === "ic" && p.composer_id !== null) return false;
      if (scopeFilter === "composer" && p.composer_id === null) return false;
      if (!term) return true;
      return (p.name + " " + (p.contact_name ?? "") + " " + (p.email ?? "") + " " + (p.city ?? "")).toLowerCase().includes(term);
    });
  }, [dataQ.data, q, kindFilter, scopeFilter]);

  return (
    <div className="mx-auto max-w-[1300px] px-6 py-6">
      <header className="mb-4">
        <p className="smallcaps text-[10px] tracking-wider text-muted-foreground">Partners</p>
        <h1 className="font-display text-3xl">Proveedores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estudios, mezcla, máster, músicos, abogados… Compartidos entre IC y representados.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proveedor…" className="pl-9" />
        </div>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">IC + representados</SelectItem>
            <SelectItem value="ic">Solo IC (compartidos)</SelectItem>
            <SelectItem value="composer">Solo de representados</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setEditing({ kind: "estudio_grabacion", shared_with_ic: true, composer_id: null })}>
          <Plus className="mr-1 h-4 w-4" />Nuevo proveedor
        </Button>
      </div>

      {dataQ.isLoading ? <Skeleton className="h-[300px]" /> : filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          <Briefcase className="mx-auto mb-2 h-8 w-8 opacity-40" />Sin proveedores
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Contacto</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Ciudad</th>
                <th className="px-3 py-2">Ámbito</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="cursor-pointer border-t border-border hover:bg-muted/30" onClick={() => setEditing(p)}>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{KIND_LABEL[p.kind] ?? p.kind}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.contact_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.city ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{composerName(p.composer_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProviderDialog
        provider={editing}
        composers={composersQ.data ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["providers"] }); setEditing(null); }}
      />
    </div>
  );
}

function ProviderDialog({
  provider, composers, onClose, onSaved,
}: {
  provider: Partial<Provider> | null;
  composers: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!provider) { setForm(null); return; }
    setForm({
      name: provider.name ?? "",
      kind: provider.kind ?? "estudio_grabacion",
      contact_name: provider.contact_name ?? "",
      email: provider.email ?? "",
      phone: provider.phone ?? "",
      website: provider.website ?? "",
      city: provider.city ?? "",
      country: provider.country ?? "",
      composer_id: provider.composer_id ?? null,
      shared_with_ic: provider.shared_with_ic ?? true,
      rate_notes: provider.rate_notes ?? "",
      notes: provider.notes ?? "",
    });
  }, [provider]);

  async function save() {
    if (!form?.name?.trim()) return toast.error("El nombre es obligatorio");
    setSaving(true);
    const payload = {
      name: form.name,
      kind: form.kind,
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      city: form.city || null,
      country: form.country || null,
      composer_id: form.composer_id || null,
      shared_with_ic: !!form.shared_with_ic,
      rate_notes: form.rate_notes || null,
      notes: form.notes || null,
    };
    const op = provider?.id
      ? (supabase as any).from("providers").update(payload).eq("id", provider.id)
      : (supabase as any).from("providers").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(provider?.id ? "Actualizado" : "Creado");
    onSaved();
  }

  async function remove() {
    if (!provider?.id || !confirm("¿Eliminar proveedor?")) return;
    const { error } = await (supabase as any).from("providers").delete().eq("id", provider.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    onSaved();
  }

  return (
    <Dialog open={!!provider} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{provider?.id ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle></DialogHeader>
        {form && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ámbito</Label>
              <Select value={form.composer_id ?? "__ic__"} onValueChange={(v) => setForm({ ...form, composer_id: v === "__ic__" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ic__">IC (compartido)</SelectItem>
                  {composers.map((c) => <SelectItem key={c.id} value={c.id}>{c.artistic_name || c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Persona de contacto</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label className="text-xs">Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label className="text-xs">Web</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            <div><Label className="text-xs">Ciudad</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label className="text-xs">País</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div className="col-span-2 flex items-center gap-2 rounded-sm border border-border bg-muted/30 px-3 py-2">
              <Switch checked={!!form.shared_with_ic} onCheckedChange={(v) => setForm({ ...form, shared_with_ic: v })} />
              <Label className="text-xs">Compartir con IC (visible para todo el equipo)</Label>
            </div>
            <div className="col-span-2"><Label className="text-xs">Tarifas / condiciones</Label><Textarea rows={2} value={form.rate_notes} onChange={(e) => setForm({ ...form, rate_notes: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Notas</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        )}
        <DialogFooter className="flex w-full justify-between sm:justify-between">
          {provider?.id ? <Button variant="ghost" onClick={remove} disabled={saving}>Eliminar</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}