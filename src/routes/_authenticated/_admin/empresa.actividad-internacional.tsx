import { ExportRowsButton } from "@/components/export-rows-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Globe, ArrowLeft } from "lucide-react";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDateEs } from "@/lib/dates";
import { useCurrentRole } from "@/lib/use-role";
import {
  INTL_TIPOS,
  INTL_TIPO_LABEL,
  INTL_PROPUESTA_ESTADOS,
  INTL_PROPUESTA_ESTADO_LABEL,
  type IntlTipo,
} from "@/lib/kpi-constants";

export const Route = createFileRoute("/_authenticated/_admin/empresa/actividad-internacional")({
  component: ActividadInternacionalPage,
});

const db = supabase as any;
const today = () => new Date().toISOString().slice(0, 10);

function ActividadInternacionalPage() {
  const { isBigC, loading } = useCurrentRole();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [pais, setPais] = useState("");
  const [fecha, setFecha] = useState(today());
  const [tipo, setTipo] = useState<IntlTipo>("productora");
  const [saving, setSaving] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["international-prospects"],
    enabled: isBigC,
    queryFn: async () => {
      const { data, error } = await db
        .from("international_prospects")
        .select("*")
        .order("fecha_primer_contacto", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (loading) return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  if (!isBigC) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <EmptyState title="Sin acceso" description="Esta sección solo está disponible para BIG C." />
      </div>
    );
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["international-prospects"] });
    qc.invalidateQueries({ queryKey: ["empresa-kpis"] });
  };

  const create = async () => {
    if (!nombre.trim()) return toast.error("Indica el nombre de la empresa.");
    setSaving(true);
    const { error } = await db.from("international_prospects").insert({
      nombre_empresa: nombre.trim(),
      pais: pais.trim() || null,
      fecha_primer_contacto: fecha || today(),
      tipo,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNombre(""); setPais(""); setTipo("productora"); setFecha(today());
    invalidate();
    toast.success("Prospect internacional añadido");
  };

  const patch = async (id: string, values: Record<string, unknown>) => {
    const { error } = await db.from("international_prospects").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Empresa</p>
          <h1 className="mt-1 font-display text-5xl title-caps">ACTIVIDAD INTERNACIONAL</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Prospects internacionales: contactos, reuniones mantenidas y estado de las propuestas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportRowsButton rows={rows ?? []} filename="actividad-internacional" sheetName="Internacional" />
          <Button variant="outline" asChild>
            <Link to="/empresa/kpis"><ArrowLeft className="mr-1 h-4 w-4" /> Volver a KPIs</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-2 rounded-sm border border-border bg-card/40 p-4 md:grid-cols-[2fr_1fr_1fr_1.3fr_auto]">
        <Input placeholder="Empresa" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input placeholder="País" value={pais} onChange={(e) => setPais(e.target.value)} />
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <Select value={tipo} onValueChange={(v) => setTipo(v as IntlTipo)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {INTL_TIPOS.map((t) => (
              <SelectItem key={t} value={t}>{INTL_TIPO_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={create} disabled={saving}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !rows?.length ? (
        <EmptyState icon={Globe} title="Sin actividad internacional" description="Añade el primer contacto internacional para empezar a medir la actividad." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Empresa</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">País</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Primer contacto</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Tipo</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Reuniones</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Propuesta</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Notas</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-display">{r.nombre_empresa}</td>
                  <td className="px-3 py-2">{r.pais ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateEs(r.fecha_primer_contacto)}</td>
                  <td className="px-3 py-2">
                    <Select value={r.tipo} onValueChange={(v) => patch(r.id, { tipo: v })}>
                      <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INTL_TIPOS.map((t) => (
                          <SelectItem key={t} value={t}>{INTL_TIPO_LABEL[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-20"
                      defaultValue={r.reuniones_mantenidas ?? 0}
                      onBlur={(e) => patch(r.id, { reuniones_mantenidas: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select value={r.estado_propuesta} onValueChange={(v) => patch(r.id, { estado_propuesta: v })}>
                      <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INTL_PROPUESTA_ESTADOS.map((e) => (
                          <SelectItem key={e} value={e}>{INTL_PROPUESTA_ESTADO_LABEL[e]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8"
                      defaultValue={r.notas ?? ""}
                      onBlur={(e) => patch(r.id, { notas: e.target.value || null })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ConfirmDeleteButton
                      iconOnly
                      title={`¿Eliminar "${r.nombre_empresa}"?`}
                      onConfirm={async () => {
                        const { error } = await db.from("international_prospects").delete().eq("id", r.id);
                        if (error) return toast.error(error.message);
                        invalidate();
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}