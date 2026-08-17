import { ExportRowsButton } from "@/components/export-rows-button";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { toast } from "sonner";
import { Plus, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateEs } from "@/lib/dates";
import {
  PARTNER_TIPOS, PARTNER_SUBTIPOS, PARTNER_TIPO_APOYO, PARTNER_AMBITOS, PARTNER_TIPO_TONE,
  type PartnerAmbito, type PartnerRecord, type PartnerTipo,
} from "@/lib/partners-model";

const db = supabase as any;

async function fetchPartners(tipo?: PartnerTipo): Promise<PartnerRecord[]> {
  let query = db.from("partners").select("*").order("nombre");
  if (tipo) query = query.eq("tipo", tipo);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PartnerRecord[];
}

export function PartnersView({
  tipo,
  title,
  description,
}: {
  tipo?: PartnerTipo;
  title: string;
  description: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tipos, setTipos] = useState<PartnerTipo[]>([]);
  const [ambito, setAmbito] = useState<string>("todos");
  const [open, setOpen] = useState(false);

  const partnersQ = useQuery({ queryKey: ["partners", tipo ?? "all"], queryFn: () => fetchPartners(tipo) });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (partnersQ.data ?? [])
      .filter((r) => !tipos.length || tipos.includes(r.tipo))
      .filter((r) => ambito === "todos" || r.ambito === ambito)
      .filter((r) => !needle || r.nombre.toLowerCase().includes(needle) || (r.subtipo ?? "").toLowerCase().includes(needle));
  }, [partnersQ.data, q, tipos, ambito]);

  function toggleTipo(t: PartnerTipo) {
    setTipos((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  const filtering = !!q || tipos.length > 0 || ambito !== "todos";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">
            <Link to="/partners" className="hover:underline">Partners</Link>
          </p>
          <h1 className="mt-1 font-display text-5xl title-caps">{title}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar partner…" className="w-56 rounded-sm" />
          <Select value={ambito} onValueChange={setAmbito}>
            <SelectTrigger className="w-40 rounded-sm"><SelectValue placeholder="Ámbito" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los ámbitos</SelectItem>
              {PARTNER_AMBITOS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Añadir partner</Button>
        </div>
      </div>

      {!tipo && (
        <div className="mb-6 flex flex-wrap gap-2">
          {PARTNER_TIPOS.map((t) => {
            const active = tipos.includes(t);
            const count = (partnersQ.data ?? []).filter((r) => r.tipo === t).length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTipo(t)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-xs smallcaps transition",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                )}
              >
                {t}s <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
          {tipos.length > 0 && (
            <button type="button" onClick={() => setTipos([])} className="px-2 text-xs smallcaps text-muted-foreground hover:underline">
              Limpiar
            </button>
          )}
        </div>
      )}

      {partnersQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        filtering ? (
          <EmptyState
            variant="filtered"
            title="Ningún resultado"
            description="Ningún partner coincide con los filtros actuales."
            action={{ label: "Limpiar filtros", onClick: () => { setQ(""); setTipos([]); setAmbito("todos"); } }}
          />
        ) : (
          <EmptyState icon={Handshake} title="Sin partners" description="Añade el primer partner de esta categoría." />
        )
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 smallcaps text-xs">Nombre</th>
                <th className="px-3 py-2 smallcaps text-xs">Tipo</th>
                <th className="px-3 py-2 smallcaps text-xs">Subtipo</th>
                <th className="px-3 py-2 smallcaps text-xs">Ámbito</th>
                <th className="px-3 py-2 smallcaps text-xs">Ubicación</th>
                <th className="px-3 py-2 smallcaps text-xs">Contacto</th>
                <th className="px-3 py-2 smallcaps text-xs">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link to="/partners/$partnerId" params={{ partnerId: r.id }} className="font-display hover:underline">{r.nombre}</Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${PARTNER_TIPO_TONE[r.tipo]}`}>{r.tipo}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.subtipo || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.ambito || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{[r.ciudad, r.pais].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.contacto_principal || r.contacto_email || "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewPartnerDialog
        open={open}
        onOpenChange={setOpen}
        defaultTipo={tipo ?? "Productora"}
        onCreated={() => qc.invalidateQueries({ queryKey: ["partners"] })}
      />
    </div>
  );
}

function NewPartnerDialog({
  open, onOpenChange, onCreated, defaultTipo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  defaultTipo: PartnerTipo;
}) {
  const [tipo, setTipo] = useState<PartnerTipo>(defaultTipo);
  const [subtipo, setSubtipo] = useState("");
  const [apoyo, setApoyo] = useState<string[]>([]);
  const [ambito, setAmbito] = useState<PartnerAmbito | "">("");
  const [nombre, setNombre] = useState("");
  const [pais, setPais] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [contacto, setContacto] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [web, setWeb] = useState("");
  const [relacion, setRelacion] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!nombre.trim()) return;
    setSaving(true);
    const { error } = await db.from("partners").insert({
      tipo, subtipo: subtipo || null, tipo_apoyo: apoyo, ambito: ambito || null,
      nombre: nombre.trim(), pais: pais.trim() || null, ciudad: ciudad.trim() || null,
      contacto_principal: contacto.trim() || null, contacto_email: email.trim() || null,
      contacto_telefono: tel.trim() || null, website: web.trim() || null,
      relacion_ic: relacion.trim() || null, notas: notas.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Partner creado");
    setNombre(""); setPais(""); setCiudad(""); setContacto(""); setEmail(""); setTel(""); setWeb(""); setRelacion(""); setNotas(""); setApoyo([]);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo partner</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del partner" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v as PartnerTipo); setSubtipo(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARTNER_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Subtipo</Label>
              <Select value={subtipo} onValueChange={setSubtipo}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {PARTNER_SUBTIPOS[tipo].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
                    onClick={() => setApoyo((prev) => (active ? prev.filter((x) => x !== a) : [...prev, a]))}
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
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Ámbito</Label>
              <Select value={ambito} onValueChange={(v) => setAmbito(v as PartnerAmbito)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {PARTNER_AMBITOS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>País</Label><Input value={pais} onChange={(e) => setPais(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Ciudad</Label><Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5"><Label>Contacto principal</Label><Input value={contacto} onChange={(e) => setContacto(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Teléfono</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5"><Label>Website</Label><Input value={web} onChange={(e) => setWeb(e.target.value)} placeholder="https://" /></div>
          <div className="grid gap-1.5"><Label>Relación con IC</Label><Textarea value={relacion} onChange={(e) => setRelacion(e.target.value)} rows={2} /></div>
          <div className="grid gap-1.5"><Label>Notas</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !nombre.trim()}>Crear partner</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}