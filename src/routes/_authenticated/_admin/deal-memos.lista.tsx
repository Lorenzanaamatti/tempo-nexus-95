import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Copy, Ban, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDateEs } from "@/lib/dates";
import { formatMoneyEs, ESTADO_LABEL, buildNextReference } from "@/lib/deal-memo-constants";
import { EstadoBadge } from "@/components/deal-memos/estado-badge";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/lista")({
  component: ListaDealMemos,
});

function ListaDealMemos() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");

  const dmQ = useQuery({
    queryKey: ["dm-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_memos")
        .select("id, referencia, obra, estado, importe_propuesto, moneda, fecha_limite_respuesta, validador_final_id, cliente_id, cliente_kind, contraparte_id, contraparte_kind, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const composerIds = new Set<string>();
      const companyIds = new Set<string>();
      const personIds = new Set<string>();
      for (const r of rows) {
        if (r.cliente_id) (r.cliente_kind === "company" ? companyIds : composerIds).add(r.cliente_id);
        if (r.contraparte_id) (r.contraparte_kind === "company" ? companyIds : composerIds).add(r.contraparte_id);
        if (r.validador_final_id) personIds.add(r.validador_final_id);
      }
      const [composers, companies, people] = await Promise.all([
        composerIds.size ? supabase.from("composers").select("id, full_name").in("id", Array.from(composerIds)).then((r) => r.data ?? []) : Promise.resolve([]),
        companyIds.size ? supabase.from("production_companies").select("id, name").in("id", Array.from(companyIds)).then((r) => r.data ?? []) : Promise.resolve([]),
        personIds.size ? supabase.from("people").select("id, full_name").in("id", Array.from(personIds)).then((r) => r.data ?? []) : Promise.resolve([]),
      ]);
      const cMap = new Map((composers as any[]).map((c) => [c.id, c.full_name]));
      const pMap = new Map((companies as any[]).map((c) => [c.id, c.name]));
      const peopleMap = new Map((people as any[]).map((p) => [p.id, p.full_name]));
      for (const r of rows) {
        r.cliente_nombre = r.cliente_id ? (r.cliente_kind === "company" ? pMap.get(r.cliente_id) : cMap.get(r.cliente_id)) ?? null : null;
        r.contraparte_nombre = r.contraparte_id ? (r.contraparte_kind === "company" ? pMap.get(r.contraparte_id) : cMap.get(r.contraparte_id)) ?? null : null;
        r.validador_final_nombre = r.validador_final_id ? peopleMap.get(r.validador_final_id) ?? null : null;
      }
      return rows;
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (dmQ.data ?? []).filter((r: any) => {
      if (estadoFilter !== "all" && r.estado !== estadoFilter) return false;
      if (!term) return true;
      return (
        r.referencia.toLowerCase().includes(term) ||
        r.obra.toLowerCase().includes(term) ||
        (r.cliente_nombre ?? "").toLowerCase().includes(term) ||
        (r.contraparte_nombre ?? "").toLowerCase().includes(term)
      );
    });
  }, [dmQ.data, q, estadoFilter]);

  async function duplicate(id: string) {
    const { data: src } = await supabase.from("deal_memos").select("*").eq("id", id).single();
    if (!src) return toast.error("No se pudo cargar");
    const refs = (dmQ.data ?? []).map((r: any) => r.referencia);
    const next = buildNextReference(refs);
    const { data: ins, error } = await supabase.from("deal_memos").insert({
      referencia: next,
      obra: src.obra + " (copia)",
      descripcion_uso: src.descripcion_uso,
      cliente_id: src.cliente_id,
      cliente_kind: src.cliente_kind,
      contraparte_id: src.contraparte_id,
      contraparte_kind: src.contraparte_kind,
      importe_propuesto: src.importe_propuesto,
      moneda: src.moneda,
      plantilla_id: src.plantilla_id,
      validador_interno_id: src.validador_interno_id,
      validador_final_id: src.validador_final_id,
      destinatario_final_email: src.destinatario_final_email,
      plazo_respuesta_dias: src.plazo_respuesta_dias,
      notas_internas: src.notas_internas,
    }).select("id").single();
    if (error || !ins) return toast.error(error?.message ?? "Error");
    await supabase.from("deal_memo_eventos").insert({ deal_memo_id: ins.id, tipo_evento: "creado", payload: { duplicado_de: id } });
    toast.success(`Duplicado como ${next}`);
    qc.invalidateQueries({ queryKey: ["dm-lista"] });
    qc.invalidateQueries({ queryKey: ["dm-kanban"] });
  }

  async function cancel(id: string) {
    const { error } = await supabase.from("deal_memos").update({ estado: "cancelado" }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("deal_memo_eventos").insert({ deal_memo_id: id, tipo_evento: "cerrado", payload: { motivo: "cancelado_desde_lista" } });
    toast.success("Deal memo cancelado");
    qc.invalidateQueries({ queryKey: ["dm-lista"] });
    qc.invalidateQueries({ queryKey: ["dm-kanban"] });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar referencia, obra, cliente…" className="pl-9" />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {dmQ.isLoading ? (
        <Skeleton className="h-[400px] rounded-sm" />
      ) : filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No hay deal memos que coincidan con los filtros.
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Ref.</th>
                <th className="px-3 py-2">Obra</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Productora</th>
                <th className="px-3 py-2 text-right">Importe</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Validador</th>
                <th className="px-3 py-2">Plazo</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-t border-border hover:bg-muted/30"
                  onClick={() => navigate({ to: "/deal-memos/$dealMemoId", params: { dealMemoId: r.id } })}
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link to="/deal-memos/$dealMemoId" params={{ dealMemoId: r.id }} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                      {r.referencia}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.obra}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.cliente_nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.contraparte_nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoneyEs(r.importe_propuesto, r.moneda)}</td>
                  <td className="px-3 py-2"><EstadoBadge estado={r.estado} /></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.validador_final_nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateEs(r.fecha_limite_respuesta)}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => navigate({ to: "/deal-memos/$dealMemoId", params: { dealMemoId: r.id } })}>
                          <Eye className="mr-2 h-4 w-4" /> Ver
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => duplicate(r.id)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => cancel(r.id)} className="text-rose-600">
                          <Ban className="mr-2 h-4 w-4" /> Cancelar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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