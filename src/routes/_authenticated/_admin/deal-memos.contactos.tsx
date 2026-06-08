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
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { TIPO_CONTACTO_LABEL, TIPO_CONTACTO_TONE, type DmContactoTipo } from "@/lib/deal-memo-constants";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/contactos")({
  component: ContactosPage,
});

const TIPOS: DmContactoTipo[] = ["interno", "cliente", "contraparte", "validador"];

function ContactosPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);

  const dataQ = useQuery({
    queryKey: ["dm-contactos"],
    queryFn: async () => ((await supabase.from("dm_contactos").select("*").order("nombre")).data ?? []),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (dataQ.data ?? []).filter((c: any) => {
      if (tipoFilter !== "all" && c.tipo !== tipoFilter) return false;
      if (!term) return true;
      return (c.nombre + " " + c.email + " " + (c.empresa ?? "")).toLowerCase().includes(term);
    });
  }, [dataQ.data, q, tipoFilter]);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contacto…" className="pl-9" />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_CONTACTO_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setEditing({ tipo: "cliente" })}><Plus className="mr-1 h-4 w-4" />Nuevo contacto</Button>
      </div>

      {dataQ.isLoading ? <Skeleton className="h-[300px]" /> : filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />Sin contactos
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">Empresa</th></tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} className="cursor-pointer border-t border-border hover:bg-muted/30" onClick={() => setEditing(c)}>
                  <td className="px-3 py-2 font-medium">{c.nombre}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email}</td>
                  <td className="px-3 py-2"><span className={`inline-block rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-wider ${TIPO_CONTACTO_TONE[c.tipo as DmContactoTipo]}`}>{TIPO_CONTACTO_LABEL[c.tipo as DmContactoTipo]}</span></td>
                  <td className="px-3 py-2 text-muted-foreground">{c.rol ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.empresa ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContactoDialog
        contacto={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["dm-contactos"] }); qc.invalidateQueries({ queryKey: ["dm-contactos-min"] }); setEditing(null); }}
      />
    </div>
  );
}

function ContactoDialog({ contacto, onClose, onSaved }: { contacto: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!contacto) { setForm(null); return; }
    setForm({
      nombre: contacto.nombre ?? "",
      email: contacto.email ?? "",
      tipo: contacto.tipo ?? "cliente",
      rol: contacto.rol ?? "",
      empresa: contacto.empresa ?? "",
      notas: contacto.notas ?? "",
    });
  }, [contacto]);

  async function save() {
    if (!form?.nombre?.trim() || !form?.email?.trim()) return toast.error("Nombre y email son obligatorios");
    setSaving(true);
    const payload = { nombre: form.nombre, email: form.email, tipo: form.tipo, rol: form.rol || null, empresa: form.empresa || null, notas: form.notas || null };
    const op = contacto?.id
      ? supabase.from("dm_contactos").update(payload).eq("id", contacto.id)
      : supabase.from("dm_contactos").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(contacto?.id ? "Actualizado" : "Creado");
    onSaved();
  }

  return (
    <Dialog open={!!contacto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{contacto?.id ? "Editar contacto" : "Nuevo contacto"}</DialogTitle></DialogHeader>
        {form && (
          <div className="space-y-3">
            <div><Label className="text-xs">Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{TIPO_CONTACTO_LABEL[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Rol</Label><Input value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} /></div>
              <div><Label className="text-xs">Empresa</Label><Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Notas</Label><Textarea rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}