import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { cn } from "@/lib/utils";
import {
  PARTNER_TIPOS, PARTNER_SUBTIPOS, PARTNER_TIPO_APOYO, PARTNER_AMBITOS, PARTNER_TIPO_TONE,
  type PartnerRecord, type PartnerTipo,
} from "@/lib/partners-model";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/partners/$partnerId")({
  component: PartnerDetail,
});

function PartnerDetail() {
  const { partnerId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<PartnerRecord>>({});
  const [saving, setSaving] = useState(false);

  const detailQ = useQuery({
    queryKey: ["partner-detail", partnerId],
    queryFn: async () => {
      const { data, error } = await db.from("partners").select("*").eq("id", partnerId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as PartnerRecord | null;
    },
  });

  useEffect(() => {
    if (detailQ.data) setForm(detailQ.data);
  }, [detailQ.data]);

  function set<K extends keyof PartnerRecord>(key: K, value: PartnerRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const { error } = await db.from("partners").update({
      tipo: form.tipo, subtipo: form.subtipo || null, tipo_apoyo: form.tipo_apoyo ?? [], ambito: form.ambito || null,
      nombre: (form.nombre ?? "").trim(), pais: form.pais || null, ciudad: form.ciudad || null,
      contacto_principal: form.contacto_principal || null, contacto_email: form.contacto_email || null,
      contacto_telefono: form.contacto_telefono || null, website: form.website || null,
      relacion_ic: form.relacion_ic || null, notas: form.notas || null,
    }).eq("id", partnerId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Partner actualizado");
    qc.invalidateQueries({ queryKey: ["partners"] });
    qc.invalidateQueries({ queryKey: ["partner-detail", partnerId] });
  }

  async function remove() {
    const { error } = await db.from("partners").delete().eq("id", partnerId);
    if (error) return toast.error(error.message);
    toast.success("Partner eliminado");
    qc.invalidateQueries({ queryKey: ["partners"] });
    navigate({ to: "/partners" });
  }

  if (detailQ.isLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-10"><ListSkeleton rows={4} /></div>;
  }
  if (!detailQ.data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <EmptyState title="Partner no encontrado" description="Este registro ya no existe." />
      </div>
    );
  }

  const tipo = (form.tipo ?? "Productora") as PartnerTipo;
  const apoyo = form.tipo_apoyo ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="smallcaps text-muted-foreground">
        <Link to="/partners" className="hover:underline">Partners</Link> · {tipo}
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl title-caps">{detailQ.data.nombre}</h1>
        <div className="flex items-center gap-2">
          <ConfirmDeleteButton
            onConfirm={remove}
            title={`¿Eliminar ${detailQ.data.nombre}?`}
            description="Se eliminará la ficha del partner. Esta acción no se puede deshacer."
          />
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>
      <div className="mt-3">
        <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${PARTNER_TIPO_TONE[tipo]}`}>{tipo}</span>
      </div>

      <div className="mt-8 grid gap-4">
        <div className="grid gap-1.5">
          <Label>Nombre</Label>
          <Input value={form.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => { set("tipo", v as PartnerTipo); set("subtipo", null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PARTNER_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {tipo !== "Productora" && (
            <div className="grid gap-1.5">
              <Label>Subtipo</Label>
              <Select value={form.subtipo ?? ""} onValueChange={(v) => set("subtipo", v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>{PARTNER_SUBTIPOS[tipo].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label>Tipo de apoyo</Label>
          <div className="flex flex-wrap gap-2">
            {PARTNER_TIPO_APOYO.map((a) => {
              const active = apoyo.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => set("tipo_apoyo", active ? apoyo.filter((x) => x !== a) : [...apoyo, a])}
                  className={cn(
                    "rounded-sm border px-2 py-1 text-xs smallcaps transition",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                  )}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-1.5">
            <Label>Ámbito</Label>
            <Select value={form.ambito ?? ""} onValueChange={(v) => set("ambito", v as PartnerRecord["ambito"])}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{PARTNER_AMBITOS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label>País</Label><Input value={form.pais ?? ""} onChange={(e) => set("pais", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Ciudad</Label><Input value={form.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-1.5"><Label>Contacto principal</Label><Input value={form.contacto_principal ?? ""} onChange={(e) => set("contacto_principal", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Email</Label><Input value={form.contacto_email ?? ""} onChange={(e) => set("contacto_email", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Teléfono</Label><Input value={form.contacto_telefono ?? ""} onChange={(e) => set("contacto_telefono", e.target.value)} /></div>
        </div>
        <div className="grid gap-1.5"><Label>Website</Label><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></div>
        <div className="grid gap-1.5"><Label>Relación con IC</Label><Textarea rows={3} value={form.relacion_ic ?? ""} onChange={(e) => set("relacion_ic", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Notas</Label><Textarea rows={4} value={form.notas ?? ""} onChange={(e) => set("notas", e.target.value)} /></div>
      </div>
    </div>
  );
}
