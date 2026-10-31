import { FichajesDoors } from "@/components/fichajes-doors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, UserPlus, FileDown } from "lucide-react";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { downloadRowsAsExcel, stamp } from "@/components/export-rows-button";
import { formatDateEs } from "@/lib/dates";
import { matchesLocation } from "@/lib/geo";
import {
  ROSTER_PROSPECT_ESTADOS,
  ROSTER_PROSPECT_ESTADO_LABEL,
  type RosterProspectEstado,
} from "@/lib/kpi-constants";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/prospects-fichaje")({
  head: () => ({
    meta: [
      { title: "Quiero fichar a | Interesante Compañía" },
      { name: "description", content: "Lista única de candidatos a incorporar al roster." },
      { property: "og:title", content: "Quiero fichar a" },
      { property: "og:description", content: "Lista única de candidatos a incorporar al roster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProspectsFichajePage,
});

const db = supabase as any;
const today = () => new Date().toISOString().slice(0, 10);
const ALL = "__all";

type Row = {
  id: string; nombre: string; rol: string | null; ciudad: string | null; pais: string | null;
  estado: RosterProspectEstado; fecha_primer_contacto: string | null; fecha_decision: string | null;
  notas: string | null; origen: string | null; composer_id: string | null;
};

const COLUMNS = [
  { key: "nombre", label: "Nombre", get: (r: Row) => r.nombre },
  { key: "rol", label: "Perfil", get: (r: Row) => r.rol ?? "" },
  { key: "ciudad", label: "Ciudad", get: (r: Row) => r.ciudad ?? "" },
  { key: "pais", label: "País", get: (r: Row) => r.pais ?? "" },
  { key: "estado", label: "Estado", get: (r: Row) => ROSTER_PROSPECT_ESTADO_LABEL[r.estado] ?? r.estado },
  { key: "contacto", label: "Primer contacto", get: (r: Row) => (r.fecha_primer_contacto ? formatDateEs(r.fecha_primer_contacto) : "") },
  { key: "decision", label: "Decisión", get: (r: Row) => (r.fecha_decision ? formatDateEs(r.fecha_decision) : "") },
  { key: "origen", label: "Origen", get: (r: Row) => r.origen ?? "" },
  { key: "notas", label: "Notas", get: (r: Row) => r.notas ?? "" },
];

function ProspectsFichajePage() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");
  const [fecha, setFecha] = useState(today());
  const [estado, setEstado] = useState<RosterProspectEstado>("sin_contacto");
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState(ALL);
  const [preview, setPreview] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["roster-prospects"],
    queryFn: async () => {
      const { data, error } = await db.from("roster_prospects").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (r.estado === "aceptado") return false;
      if (fEstado !== ALL && r.estado !== fEstado) return false;
      if (!n) return true;
      return r.nombre.toLowerCase().includes(n) || (r.rol ?? "").toLowerCase().includes(n) || matchesLocation(q, r.ciudad, r.pais);
    });
  }, [rows, q, fEstado]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["roster-prospects"] });
    qc.invalidateQueries({ queryKey: ["empresa-kpis"] });
  };

  const accepted = (r: { nombre: string; rol: string | null }) => {
    qc.invalidateQueries({ queryKey: ["composers"] });
    const dest = /supervis/i.test(r.rol ?? "") ? "supervisores" : "compositores";
    toast.success(`${r.nombre} añadido al roster de ${dest}`);
  };

  const create = async () => {
    if (!nombre.trim()) return toast.error("Indica el nombre.");
    setSaving(true);
    const { error } = await db.from("roster_prospects").insert({
      nombre: nombre.trim(), rol: rol.trim() || null, fecha_primer_contacto: fecha || today(), estado,
      ciudad: ciudad.trim() || null, pais: pais.trim() || null, notas: notas.trim() || null, origen: "Manual",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    if (estado === "aceptado") accepted({ nombre: nombre.trim(), rol: rol.trim() || null });
    setNombre(""); setRol(""); setNotas(""); setCiudad(""); setPais(""); setEstado("sin_contacto"); setFecha(today());
    refresh();
    toast.success("Añadido a la lista");
  };

  const patch = async (id: string, values: Record<string, unknown>) => {
    const { error } = await db.from("roster_prospects").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    if (values.estado === "aceptado") {
      const r = (rows ?? []).find((x) => x.id === id);
      if (r) accepted(r);
    }
    refresh();
  };

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Quiero fichar a — ${stamp().replace(/-/g, "/")}`, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [COLUMNS.map((c) => c.label)],
      body: filtered.map((r) => COLUMNS.map((c) => String(c.get(r)))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 53, 63] },
    });
    doc.save(`quiero-fichar-a-${stamp()}.pdf`);
  };

  const exportExcel = () =>
    downloadRowsAsExcel(filtered, { filename: "quiero-fichar-a", sheetName: "Quiero fichar a", columns: COLUMNS });

  return (
    <div className="mx-auto max-w-[1700px] px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Clientes · Fichajes que queremos</p>
          <h1 className="mt-1 font-display text-5xl title-caps">QUIERO FICHAR A</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Lista única de personas que queremos incorporar al roster. Todo se edita aquí directamente.
          </p>
        </div>
        <Button variant="outline" onClick={() => setPreview(true)}>
          <FileDown className="mr-1 h-4 w-4" /> Descargar Excel / PDF
        </Button>
      </div>

      <div className="mb-8"><FichajesDoors selected="prospects" /></div>

      <div className="mb-6 grid gap-2 rounded-sm border border-border bg-card/40 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr_2fr_auto]">
        <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input placeholder="Perfil" value={rol} onChange={(e) => setRol(e.target.value)} />
        <Input placeholder="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        <Input placeholder="País" value={pais} onChange={(e) => setPais(e.target.value)} />
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <EstadoSelect value={estado} onChange={setEstado} />
        <Textarea rows={1} placeholder="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        <Button onClick={create} disabled={saving}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input className="h-9 w-72" placeholder="Buscar nombre, perfil o ubicación…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={fEstado} onValueChange={setFEstado}>
          <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {ROSTER_PROSPECT_ESTADOS.map((e) => <SelectItem key={e} value={e}>{ROSTER_PROSPECT_ESTADO_LABEL[e]}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{filtered.length} personas</span>
      </div>

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : !filtered.length ? (
        <EmptyState icon={UserPlus} title="Sin resultados" description="Añade a alguien o ajusta los filtros." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left smallcaps text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Perfil</th>
                <th className="px-3 py-2">Ciudad / País</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Primer contacto</th>
                <th className="px-3 py-2">Decisión</th>
                <th className="px-3 py-2">Notas</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <Input className="h-8 min-w-44 font-display" defaultValue={r.nombre}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== r.nombre && patch(r.id, { nombre: e.target.value.trim() })} />
                    {r.composer_id && (
                      <Link to="/composers/$composerId" params={{ composerId: r.composer_id }} className="mt-1 block text-xs text-primary hover:underline">Ver ficha del roster</Link>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input className="h-8 w-36" defaultValue={r.rol ?? ""} onBlur={(e) => e.target.value !== (r.rol ?? "") && patch(r.id, { rol: e.target.value || null })} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Input className="h-8 w-28" placeholder="Ciudad" defaultValue={r.ciudad ?? ""} onBlur={(e) => e.target.value !== (r.ciudad ?? "") && patch(r.id, { ciudad: e.target.value || null })} />
                      <Input className="h-8 w-28" placeholder="País" defaultValue={r.pais ?? ""} onBlur={(e) => e.target.value !== (r.pais ?? "") && patch(r.id, { pais: e.target.value || null })} />
                    </div>
                  </td>
                  <td className="px-3 py-2"><EstadoSelect value={r.estado} onChange={(v) => patch(r.id, { estado: v })} compact /></td>
                  <td className="px-3 py-2">
                    <Input type="date" className="h-8 w-[150px]" defaultValue={r.fecha_primer_contacto ?? ""} onBlur={(e) => patch(r.id, { fecha_primer_contacto: e.target.value || null })} />
                  </td>
                  <td className="px-3 py-2">
                    <Input type="date" className="h-8 w-[150px]" defaultValue={r.fecha_decision ?? ""} onBlur={(e) => patch(r.id, { fecha_decision: e.target.value || null })} />
                  </td>
                  <td className="px-3 py-2">
                    <Textarea rows={1} className="min-h-8 w-64 text-xs" defaultValue={r.notas ?? ""} onBlur={(e) => e.target.value !== (r.notas ?? "") && patch(r.id, { notas: e.target.value || null })} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.origen ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <ConfirmDeleteButton iconOnly title={`¿Quitar a "${r.nombre}" de la lista?`}
                      onConfirm={async () => {
                        const { error } = await db.from("roster_prospects").delete().eq("id", r.id);
                        if (error) return toast.error(error.message);
                        refresh();
                      }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-6xl">
          <DialogHeader><DialogTitle>Vista previa · {filtered.length} personas</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-sm border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted text-left">
                <tr>{COLUMNS.map((c) => <th key={c.key} className="px-2 py-1.5">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    {COLUMNS.map((c) => <td key={c.key} className="px-2 py-1">{String(c.get(r))}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={exportExcel}>Descargar Excel</Button>
            <Button onClick={exportPdf}>Descargar PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EstadoSelect({ value, onChange, compact }: { value: RosterProspectEstado; onChange: (v: RosterProspectEstado) => void; compact?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RosterProspectEstado)}>
      <SelectTrigger className={compact ? "h-8 w-[190px]" : undefined}><SelectValue /></SelectTrigger>
      <SelectContent>
        {ROSTER_PROSPECT_ESTADOS.map((e) => <SelectItem key={e} value={e}>{ROSTER_PROSPECT_ESTADO_LABEL[e]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
