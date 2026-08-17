import { ExportRowsButton } from "@/components/export-rows-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, UserPlus, Target, Users } from "lucide-react";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ComposerThumb } from "@/components/composer-thumb";
import { formatDateEs } from "@/lib/dates";
import { formatLocation, matchesLocation } from "@/lib/geo";
import {
  ROSTER_PROSPECT_ESTADOS,
  ROSTER_PROSPECT_ESTADO_LABEL,
  type RosterProspectEstado,
} from "@/lib/kpi-constants";

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/prospects-fichaje")({
  component: ProspectsFichajePage,
});

const db = supabase as any;
const today = () => new Date().toISOString().slice(0, 10);

function ProspectsFichajePage() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(today());
  const [estado, setEstado] = useState<RosterProspectEstado>("contactado");
  const [notas, setNotas] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["roster-prospects"],
    queryFn: async () => {
      const { data, error } = await db
        .from("roster_prospects")
        .select("*")
        .order("fecha_primer_contacto", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const rosterQ = useQuery({
    queryKey: ["prospects-fichaje-roster"],
    queryFn: async () => {
      const [composers, targets] = await Promise.all([
        supabase
          .from("composers")
          .select(
            "id, full_name, artistic_name, city, country, ciudad_origen, pais_origen, photo_path, roster_role, representation_status, prospect_next_action_date, prospect_target_date",
          )
          .eq("representation_status", "en_negociacion")
          .order("full_name"),
        supabase
          .from("target_accounts")
          .select("id, name, status, priority, account_type, roster_kind")
          .eq("account_type", "roster")
          .order("name"),
      ]);
      if (composers.error) throw composers.error;
      if (targets.error) throw targets.error;
      return { composers: composers.data ?? [], targets: targets.data ?? [] };
    },
  });

  const filtered = (rows ?? []).filter((r: any) => matchesLocation(locFilter, r.ciudad, r.pais));
  const prospeccion = (rosterQ.data?.composers ?? []).filter((c: any) =>
    matchesLocation(locFilter, c.city, c.country, c.ciudad_origen, c.pais_origen),
  );
  const objetivo = rosterQ.data?.targets ?? [];

  const create = async () => {
    if (!nombre.trim()) return toast.error("Indica el nombre del prospect.");
    setSaving(true);
    const { error } = await db.from("roster_prospects").insert({
      nombre: nombre.trim(),
      fecha_primer_contacto: fecha || today(),
      estado,
      ciudad: ciudad.trim() || null,
      pais: pais.trim() || null,
      notas: notas.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNombre(""); setNotas(""); setCiudad(""); setPais(""); setEstado("contactado"); setFecha(today());
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
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Oportunidades de ventas</p>
          <h1 className="mt-1 font-display text-5xl title-caps">PROSPECTS DE FICHAJE</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Todo el embudo de incorporación al roster en una sola pantalla: candidatos contactados,
            representados en prospección y roster objetivo procedente de cuentas objetivo.
          </p>
        </div>
        <ExportRowsButton rows={filtered} filename="prospects-fichaje" sheetName="Prospects" />
      </div>

      <div className="mb-6 grid gap-2 rounded-sm border border-border bg-card/40 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1.2fr_2fr_auto]">
        <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input placeholder="Ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        <Input placeholder="País" value={pais} onChange={(e) => setPais(e.target.value)} />
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

      <div className="mb-4 flex items-center gap-2">
        <Input
          className="h-9 w-64"
          placeholder="Filtrar por ubicación…"
          aria-label="Filtrar por área geográfica"
          value={locFilter}
          onChange={(e) => setLocFilter(e.target.value)}
        />
        {locFilter && <Button variant="ghost" size="sm" onClick={() => setLocFilter("")}>Limpiar</Button>}
      </div>

      <div className="space-y-14">
        <section>
          <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
            <h2 className="font-display text-3xl title-caps">Candidatos contactados</h2>
            <span className="font-mono text-xs text-muted-foreground">{filtered.length}</span>
          </div>
          {isLoading ? (
            <ListSkeleton rows={5} />
          ) : !filtered.length ? (
            <EmptyState icon={UserPlus} title="Sin prospects" description="Añade el primer candidato para empezar a medir el embudo de fichajes." />
          ) : (
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Nombre</th>
                    <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Ubicación</th>
                    <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Primer contacto</th>
                    <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Estado</th>
                    <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Decisión</th>
                    <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Notas</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="px-3 py-2 font-display">
                        {r.nombre}
                        <span className="block text-xs font-sans text-muted-foreground">
                          {formatLocation(r.ciudad, r.pais) || "Sin ubicación"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Input className="h-8 w-28" placeholder="Ciudad" defaultValue={r.ciudad ?? ""} onBlur={(e) => patch(r.id, { ciudad: e.target.value || null })} />
                          <Input className="h-8 w-28" placeholder="País" defaultValue={r.pais ?? ""} onBlur={(e) => patch(r.id, { pais: e.target.value || null })} />
                        </div>
                      </td>
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
                        <Input type="date" className="h-8 w-[150px]" defaultValue={r.fecha_decision ?? ""} onBlur={(e) => patch(r.id, { fecha_decision: e.target.value || null })} />
                      </td>
                      <td className="px-3 py-2">
                        <Input className="h-8" defaultValue={r.notas ?? ""} onBlur={(e) => patch(r.id, { notas: e.target.value || null })} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ConfirmDeleteButton
                          iconOnly
                          title={`¿Eliminar "${r.nombre}"?`}
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
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
            <h2 className="font-display text-3xl title-caps">Roster en prospección</h2>
            <span className="font-mono text-xs text-muted-foreground">{prospeccion.length}</span>
          </div>
          {rosterQ.isLoading ? (
            <ListSkeleton rows={4} />
          ) : !prospeccion.length ? (
            <EmptyState icon={Users} title="Sin fichas en prospección" description="Marca una ficha como «En negociación» para que aparezca aquí." action={{ label: "Ver roster", to: "/roster" }} />
          ) : (
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 text-left smallcaps text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Representado</th>
                    <th className="px-3 py-2">Perfil</th>
                    <th className="px-3 py-2">Próxima acción</th>
                    <th className="px-3 py-2">Objetivo contratación</th>
                  </tr>
                </thead>
                <tbody>
                  {prospeccion.map((c: any) => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <Link to="/composers/$composerId" params={{ composerId: c.id }} className="flex items-center gap-3">
                          <ComposerThumb
                            path={c.photo_path}
                            alt={c.full_name}
                            className="h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-muted"
                            imgClassName="h-full w-full object-cover"
                            fallback={
                              <div className="flex h-full items-center justify-center font-display text-lg text-muted-foreground">
                                {c.full_name?.[0] ?? "·"}
                              </div>
                            }
                          />
                          <span className="min-w-0">
                            <span className="block font-display text-base leading-tight hover:text-primary">{c.full_name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {formatLocation(c.city ?? c.ciudad_origen, c.country ?? c.pais_origen) || "—"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{c.roster_role ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.prospect_next_action_date ? formatDateEs(c.prospect_next_action_date) : "Pendiente"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.prospect_target_date ? formatDateEs(c.prospect_target_date) : "Pendiente"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
            <h2 className="font-display text-3xl title-caps">Roster objetivo</h2>
            <span className="font-mono text-xs text-muted-foreground">{objetivo.length}</span>
          </div>
          {rosterQ.isLoading ? (
            <ListSkeleton rows={4} />
          ) : !objetivo.length ? (
            <EmptyState icon={Target} title="Sin roster objetivo" description="Añade cuentas de tipo Roster para hacer seguimiento de futuras incorporaciones." action={{ label: "Ir a cuentas objetivo", to: "/marketing/target-accounts" }} />
          ) : (
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left smallcaps text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Perfil</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Prioridad</th>
                  </tr>
                </thead>
                <tbody>
                  {objetivo.map((t: any) => (
                    <tr key={t.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <Link to="/marketing/target-accounts/$accountId" params={{ accountId: t.id }} className="font-display text-base hover:text-primary">
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{t.roster_kind ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.status ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.priority ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
