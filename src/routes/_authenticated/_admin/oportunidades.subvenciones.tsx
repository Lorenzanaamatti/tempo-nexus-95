import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ListSkeleton } from "@/components/list-states";
import { ExportRowsButton } from "@/components/export-rows-button";
import { Money } from "@/components/money";
import { formatDateEs } from "@/lib/dates";
import { SUBVENCION_ESTADOS, SUBVENCION_TIPOS, daysUntilGrant, grantDeadlineLabel } from "@/lib/subvenciones";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/subvenciones")({
  component: SubvencionesPage,
  head: () => ({ meta: [
    { title: "Subvenciones | Interesante Compañía" },
    { name: "description", content: "Gestión de subvenciones, plazos, responsables y expedientes." },
    { property: "og:title", content: "Subvenciones | Interesante Compañía" },
    { property: "og:description", content: "Gestión de subvenciones, plazos, responsables y expedientes." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});

type QuickForm = Record<string, string>;
const EMPTY: QuickForm = { nombre_corto: "", nombre_convocatoria: "", institucion_nombre: "", empresa_solicitante: "", proyecto_vinculado: "", tipo: "Subvención", importe_maximo: "", porcentaje_subvencionable: "", fecha_limite_solicitud: "", periodo_ejecucion_inicio: "", periodo_ejecucion_fin: "", responsable_person_id: "", estado: "Por preparar", url_convocatoria: "" };

function SubvencionesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<QuickForm>(EMPTY);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [empresa, setEmpresa] = useState("todos");
  const [responsable, setResponsable] = useState("todos");
  const [sortAsc, setSortAsc] = useState(true);
  const [saving, setSaving] = useState(false);

  const grantsQ = useQuery({ queryKey: ["subvenciones"], queryFn: async () => {
    const { data, error } = await db.from("oportunidades_subvenciones").select("*, responsable:people!oportunidades_subvenciones_responsable_person_id_fkey(id, full_name)").order("fecha_limite_solicitud", { ascending: true, nullsFirst: false });
    if (error) throw error; return data ?? [];
  }});
  const peopleQ = useQuery({ queryKey: ["people-grants"], queryFn: async () => {
    const { data, error } = await db.from("people").select("id, full_name").eq("role", "ic_team").order("full_name");
    if (error) throw error; return data ?? [];
  }});
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...(grantsQ.data ?? [])].filter((r: any) =>
      (estado === "todos" || r.estado === estado) && (empresa === "todos" || r.empresa_solicitante === empresa) &&
      (responsable === "todos" || r.responsable_person_id === responsable) &&
      (!needle || [r.nombre_corto, r.nombre_convocatoria, r.institucion_nombre, r.proyecto_vinculado].some((x) => String(x ?? "").toLowerCase().includes(needle)))
    ).sort((a: any, b: any) => (a.fecha_limite_solicitud ?? "9999").localeCompare(b.fecha_limite_solicitud ?? "9999") * (sortAsc ? 1 : -1));
  }, [grantsQ.data, q, estado, empresa, responsable, sortAsc]);
  const companies = [...new Set((grantsQ.data ?? []).map((r: any) => r.empresa_solicitante).filter(Boolean))] as string[];

  async function createGrant() {
    if (!form.nombre_corto.trim() || !form.nombre_convocatoria.trim()) return toast.error("Completa el nombre corto y el nombre oficial.");
    setSaving(true);
    const numeric = ["importe_maximo", "porcentaje_subvencionable"];
    const payload: any = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]));
    for (const key of numeric) payload[key] = form[key] ? Number(form[key]) : null;
    const { data, error } = await db.from("oportunidades_subvenciones").insert(payload).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["subvenciones"] });
    setOpen(false); setForm(EMPTY);
    navigate({ to: "/oportunidades/subvenciones/$subvencionId", params: { subvencionId: data.id } });
  }

  return <div className="mx-auto max-w-[1700px] px-6 py-10">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
      <div><p className="smallcaps text-rust">Partners</p><h1 className="mt-1 font-display text-5xl font-extrabold">SUBVENCIONES</h1><p className="mt-2 text-base text-muted-foreground">Expedientes, plazos y financiación pública o privada.</p></div>
      <div className="flex gap-2"><ExportRowsButton rows={rows} filename="subvenciones" sheetName="Subvenciones" /><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva subvención</Button></div>
    </header>
    <div className="my-6 grid gap-3 md:grid-cols-4">
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar subvención u organismo" /></div>
      <Select value={estado} onValueChange={setEstado}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los estados</SelectItem>{SUBVENCION_ESTADOS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
      <Select value={empresa} onValueChange={setEmpresa}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas las empresas</SelectItem>{companies.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
      <Select value={responsable} onValueChange={setResponsable}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los responsables</SelectItem>{(peopleQ.data ?? []).map((p:any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select>
    </div>
    {grantsQ.isLoading ? <ListSkeleton rows={6}/> : !rows.length ? <EmptyState title="Sin subvenciones" description="Da de alta el primer expediente en menos de un minuto." action={{ label: "Nueva subvención", onClick: () => setOpen(true) }}/> :
      <div className="overflow-x-auto border-y border-border"><table className="w-full text-base"><thead><tr className="text-left smallcaps text-xs text-muted-foreground"><th className="px-3 py-3">Subvención</th><th className="px-3 py-3">Organismo</th><th className="px-3 py-3">Empresa / proyecto</th><th className="px-3 py-3">Máximo</th><th className="px-3 py-3"><Button variant="ghost" size="sm" onClick={() => setSortAsc(v=>!v)}>Deadline <ArrowUpDown className="ml-1 h-3 w-3"/></Button></th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Responsable</th></tr></thead>
      <tbody className="divide-y divide-border">{rows.map((r:any) => { const days=daysUntilGrant(r.fecha_limite_solicitud); return <tr key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate({to:"/oportunidades/subvenciones/$subvencionId",params:{subvencionId:r.id}})}><td className="px-3 py-4"><strong className="font-display text-lg text-primary">{r.nombre_corto}</strong><span className="block text-sm text-muted-foreground">{r.nombre_convocatoria}</span></td><td className="px-3 py-4">{r.institucion_nombre || "—"}</td><td className="px-3 py-4">{r.empresa_solicitante || "—"}<span className="block text-sm text-muted-foreground">{r.proyecto_vinculado || "—"}</span></td><td className="px-3 py-4"><Money value={r.importe_maximo}/></td><td className="px-3 py-4"><span>{formatDateEs(r.fecha_limite_solicitud)}</span><span className={`ml-2 inline-block rounded-sm px-2 py-1 text-xs font-bold ${days !== null && days <= 7 ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}>{grantDeadlineLabel(r.fecha_limite_solicitud)}</span></td><td className="px-3 py-4">{r.estado}</td><td className="px-3 py-4">{r.responsable?.full_name || "—"}</td></tr>})}</tbody></table></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle className="font-display text-3xl">Alta rápida de subvención</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Solo los datos esenciales. Podrás completar el expediente después.</p><div className="grid gap-4 md:grid-cols-2">
      <Quick label="Nombre corto *"><Input value={form.nombre_corto} onChange={e=>setForm({...form,nombre_corto:e.target.value})} placeholder="ACCIÓ – I+D 2026"/></Quick><Quick label="Nombre oficial *"><Input value={form.nombre_convocatoria} onChange={e=>setForm({...form,nombre_convocatoria:e.target.value})}/></Quick>
      <Quick label="Organismo convocante"><Input value={form.institucion_nombre} onChange={e=>setForm({...form,institucion_nombre:e.target.value})}/></Quick><Quick label="Empresa solicitante"><Input value={form.empresa_solicitante} onChange={e=>setForm({...form,empresa_solicitante:e.target.value})}/></Quick>
      <Quick label="Proyecto o área"><Input value={form.proyecto_vinculado} onChange={e=>setForm({...form,proyecto_vinculado:e.target.value})}/></Quick><Quick label="Tipo de ayuda"><Select value={form.tipo} onValueChange={v=>setForm({...form,tipo:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{SUBVENCION_TIPOS.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Quick>
      <Quick label="Importe máximo (€)"><Input type="number" value={form.importe_maximo} onChange={e=>setForm({...form,importe_maximo:e.target.value})}/></Quick><Quick label="% subvencionable"><Input type="number" value={form.porcentaje_subvencionable} onChange={e=>setForm({...form,porcentaje_subvencionable:e.target.value})}/></Quick>
      <Quick label="Fecha límite"><Input type="date" value={form.fecha_limite_solicitud} onChange={e=>setForm({...form,fecha_limite_solicitud:e.target.value})}/></Quick><Quick label="Periodo de ejecución"><div className="grid grid-cols-2 gap-2"><Input type="date" value={form.periodo_ejecucion_inicio} onChange={e=>setForm({...form,periodo_ejecucion_inicio:e.target.value})}/><Input type="date" value={form.periodo_ejecucion_fin} onChange={e=>setForm({...form,periodo_ejecucion_fin:e.target.value})}/></div></Quick>
      <Quick label="Responsable"><Select value={form.responsable_person_id || undefined} onValueChange={v=>setForm({...form,responsable_person_id:v})}><SelectTrigger><SelectValue placeholder="Sin asignar"/></SelectTrigger><SelectContent>{(peopleQ.data??[]).map((p:any)=><SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select></Quick><Quick label="Estado"><Select value={form.estado} onValueChange={v=>setForm({...form,estado:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{SUBVENCION_ESTADOS.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Quick>
      <Quick label="URL oficial" full><Input type="url" value={form.url_convocatoria} onChange={e=>setForm({...form,url_convocatoria:e.target.value})} placeholder="https://"/></Quick>
    </div><DialogFooter><Button variant="ghost" onClick={()=>setOpen(false)}>Cancelar</Button><Button onClick={createGrant} disabled={saving}>{saving?"Guardando…":"Crear y abrir ficha"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Quick({label,children,full=false}:{label:string;children:React.ReactNode;full?:boolean}) { return <div className={full?"md:col-span-2":""}><Label className="mb-1.5 block">{label}</Label>{children}</div>; }