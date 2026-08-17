import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, UserPlus, ArrowLeft } from "lucide-react";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDateEs } from "@/lib/dates";
import { useCurrentRole } from "@/lib/use-role";
import {
  ROSTER_PROSPECT_ESTADOS,
  ROSTER_PROSPECT_ESTADO_LABEL,
  type RosterProspectEstado,
} from "@/lib/kpi-constants";

export const Route = createFileRoute("/_authenticated/_admin/empresa/roster-prospects")({
  component: RosterProspectsPage,
});

const db = supabase as any;
const today = () => new Date().toISOString().slice(0, 10);

function RosterProspectsPage() {
  const { isBigC, loading } = useCurrentRole();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(today());
  const [estado, setEstado] = useState<RosterProspectEstado>("contactado");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["roster-prospects"],
    enabled: isBigC,
    queryFn: async () => {
      const { data, error } = await db
        .from("roster_prospects")
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

  const create = async () => {
    if (!nombre.trim()) return toast.error("Indica el nombre del prospect.");
    setSaving(true);
    const { error } = await db.from("roster_prospects").insert({
      nombre: nombre.trim(),
      fecha_primer_contacto: fecha || today(),
      estado,
      notas: notas.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNombre(""); setNotas(""); setEstado("contactado"); setFecha(today());
    qc.invalidateQueries({ queryKey: ["roster-prospects"] });
    qc.invalidateQueries({ queryKey: ["empresa-kpis"] });
    toast.success("Prospect añadido");
  };

  const patch = async (id: string, values: Record<string, unknown>) => {
    const { error } = await db.from("roster_prospects").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["roster-prospects"] });
    qc.invalidateQueries({ queryKey: ["empresa-kpis"] });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Empresa</p>
          <h1 className="mt-1 font-display text-5xl title-caps">PROSPECTS DE FICHAJE</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Seguimiento de candidatos a incorporarse al roster: primer contacto, estado y decisión.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/empresa/kpis"><ArrowLeft className="mr-1 h-4 w-4" /> Volver a KPIs</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-2 rounded-sm border border-border bg-card/40 p-4 md:grid-cols-[2fr_1fr_1.2fr_2fr_auto]">
        <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <Select value={estado} onValueChange={(v) => setEstado(v as RosterProspectEstado)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROSTER_PROSPECT_ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>{ROSTER_PROSPECT_ESTADO_LABEL[e]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea rows={1} placeholder="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        <Button onClick={create} disabled={saving}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : !rows?.length ? (
        <EmptyState icon={UserPlus} title="Sin prospects" description="Añade el primer candidato para empezar a medir el embudo de fichajes." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Nombre</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Primer contacto</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Estado</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Decisión</th>
                <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Notas</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-display">{r.nombre}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateEs(r.fecha_primer_contacto)}</td>
                  <td className="px-3 py-2">
                    <Select value={r.estado} onValueChange={(v) => patch(r.id, { estado: v })}>
                      <SelectTrigger className="h-8 w-[210px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROSTER_PROSPECT_ESTADOS.map((e) => (
                          <SelectItem key={e} value={e}>{ROSTER_PROSPECT_ESTADO_LABEL[e]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      className="h-8 w-[150px]"
                      defaultValue={r.fecha_decision ?? ""}
                      onBlur={(e) => patch(r.id, { fecha_decision: e.target.value || null })}
                    />
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
                      onConfirm={async () => {
                        const { error } = await db.from("roster_prospects").delete().eq("id", r.id);
                        if (error) return toast.error(error.message);
                        qc.invalidateQueries({ queryKey: ["roster-prospects"] });
                        qc.invalidateQueries({ queryKey: ["empresa-kpis"] });
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