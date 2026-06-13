import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, KanbanSquare } from "lucide-react";
import { toast } from "sonner";
import { KANBAN_COLUMNS, buildNextReference, type KanbanColumnKey } from "@/lib/deal-memo-constants";
import { KanbanCard, type KanbanCardData } from "@/components/deal-memos/kanban-card";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/")({
  component: DealMemosKanban,
});

type Row = {
  id: string;
  referencia: string;
  obra: string;
  estado: string;
  importe_propuesto: number | string | null;
  moneda: string | null;
  updated_at: string;
  fecha_limite_respuesta: string | null;
  plantilla_id: string | null;
  validador_final_id: string | null;
  cliente_id: string | null;
  contraparte_id: string | null;
  cliente_kind: string | null;
  contraparte_kind: string | null;
  cliente_nombre?: string | null;
  contraparte_nombre?: string | null;
};

type PartyOption = { value: string; nombre: string };
type ValidatorOption = { id: string; nombre: string };

const partyValue = (kind: string | null, id: string | null) => (kind && id ? `${kind}:${id}` : "");

function DealMemosKanban() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [openNew, setOpenNew] = useState(false);
  const [clienteFilter, setClienteFilter] = useState("all");
  const [plantillaFilter, setPlantillaFilter] = useState("all");
  const [validadorFilter, setValidadorFilter] = useState("all");

  const dmQ = useQuery({
    queryKey: ["dm-kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_memos")
        .select("id, referencia, obra, estado, importe_propuesto, moneda, updated_at, fecha_limite_respuesta, plantilla_id, validador_final_id, cliente_id, contraparte_id, cliente_kind, contraparte_kind")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Row[];

      // Resolve nombres de cliente/contraparte (composers o production_companies)
      const composerIds = new Set<string>();
      const companyIds = new Set<string>();
      for (const r of rows) {
        if (r.cliente_id) (r.cliente_kind === "company" ? companyIds : composerIds).add(r.cliente_id);
        if (r.contraparte_id) (r.contraparte_kind === "company" ? companyIds : composerIds).add(r.contraparte_id);
      }
      const [composers, companies] = await Promise.all([
        composerIds.size
          ? supabase.from("composers").select("id, full_name").in("id", Array.from(composerIds)).then((r) => r.data ?? [])
          : Promise.resolve([] as { id: string; full_name: string }[]),
        companyIds.size
          ? supabase.from("production_companies").select("id, name").in("id", Array.from(companyIds)).then((r) => r.data ?? [])
          : Promise.resolve([] as { id: string; name: string }[]),
      ]);
      const cMap = new Map(composers.map((c) => [c.id, c.full_name]));
      const pMap = new Map(companies.map((c) => [c.id, c.name]));
      const nameFor = (id: string | null, kind: string | null) => {
        if (!id) return null;
        return (kind === "company" ? pMap.get(id) : cMap.get(id)) ?? null;
      };
      for (const r of rows) {
        r.cliente_nombre = nameFor(r.cliente_id, r.cliente_kind);
        r.contraparte_nombre = nameFor(r.contraparte_id, r.contraparte_kind);
      }
      return rows;
    },
  });

  const clientesQ = useQuery({
    queryKey: ["dm-clientes-options"],
    queryFn: async () => {
      const [composers, companies] = await Promise.all([
        supabase.from("composers").select("id, full_name").neq("roster_role", "ic_company").order("full_name").then((r) => r.data ?? []),
        supabase.from("production_companies").select("id, name").order("name").then((r) => r.data ?? []),
      ]);
      return [
        ...composers.map((c) => ({ value: `composer:${c.id}`, nombre: `Roster · ${c.full_name}` })),
        ...companies.map((c) => ({ value: `company:${c.id}`, nombre: `Productora · ${c.name}` })),
      ] satisfies PartyOption[];
    },
  });
  const validadoresQ = useQuery({
    queryKey: ["dm-validadores-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("people")
        .select("id, full_name")
        .eq("role", "ic_team")
        .eq("is_virtual_assistant", false)
        .order("full_name");
      return ((data ?? []) as { id: string; full_name: string }[]).map((p) => ({ id: p.id, nombre: p.full_name })) satisfies ValidatorOption[];
    },
  });
  const plantillasQ = useQuery({
    queryKey: ["dm-plantillas-min"],
    queryFn: async () => (await supabase.from("dm_plantillas").select("id, nombre, activa").eq("activa", true)).data ?? [],
  });

  const clienteOptions = clientesQ.data ?? [];
  const validadorOptions = validadoresQ.data ?? [];

  const filtered = useMemo(() => {
    return (dmQ.data ?? []).filter((r) => {
      if (clienteFilter !== "all" && partyValue(r.cliente_kind, r.cliente_id) !== clienteFilter) return false;
      if (plantillaFilter !== "all" && r.plantilla_id !== plantillaFilter) return false;
      if (validadorFilter !== "all" && r.validador_final_id !== validadorFilter) return false;
      return true;
    });
  }, [dmQ.data, clienteFilter, plantillaFilter, validadorFilter]);

  const byColumn = useMemo(() => {
    const map = new Map<KanbanColumnKey, KanbanCardData[]>();
    for (const col of KANBAN_COLUMNS) map.set(col.key, []);
    for (const r of filtered) {
      const col = KANBAN_COLUMNS.find((c) => c.estados.includes(r.estado as never));
      if (!col) continue;
      map.get(col.key)!.push({
        id: r.id,
        referencia: r.referencia,
        obra: r.obra,
        importe_propuesto: r.importe_propuesto,
        moneda: r.moneda,
        updated_at: r.updated_at,
        fecha_limite_respuesta: r.fecha_limite_respuesta,
        cliente_nombre: r.cliente_nombre ?? null,
        contraparte_nombre: r.contraparte_nombre ?? null,
      });
    }
    return map;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clienteOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={plantillaFilter} onValueChange={setPlantillaFilter}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Plantilla" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las plantillas</SelectItem>
              {(plantillasQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={validadorFilter} onValueChange={setValidadorFilter}>
            <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Validador final" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los validadores</SelectItem>
              {validadorOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nuevo Deal Memo
        </Button>
      </div>

      {dmQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[420px] rounded-sm" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {KANBAN_COLUMNS.map((col) => {
            const cards = byColumn.get(col.key) ?? [];
            return (
              <div key={col.key} className={`flex max-h-[calc(100vh-260px)] flex-col rounded-sm border border-border ${col.bg}`}>
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider">{col.label}</h3>
                  <span className="rounded-sm bg-background/70 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">{cards.length}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {cards.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
                      <KanbanSquare className="h-5 w-5 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">Sin deal memos</p>
                    </div>
                  ) : (
                    cards.map((c) => <KanbanCard key={c.id} data={c} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewDealMemoDialog
        open={openNew}
        onOpenChange={setOpenNew}
        existingRefs={(dmQ.data ?? []).map((d) => d.referencia)}
        onCreated={(id) => {
          qc.invalidateQueries({ queryKey: ["dm-kanban"] });
          qc.invalidateQueries({ queryKey: ["dm-lista"] });
          setOpenNew(false);
          navigate({ to: "/deal-memos/$dealMemoId", params: { dealMemoId: id } });
        }}
      />
    </div>
  );
}

function NewDealMemoDialog({
  open, onOpenChange, existingRefs, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingRefs: string[];
  onCreated: (id: string) => void;
}) {
  const [obra, setObra] = useState("");
  const [email, setEmail] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

  const nextRef = useMemo(() => buildNextReference(existingRefs), [existingRefs, open]);

  async function handleCreate() {
    if (!obra.trim() || !email.trim()) {
      toast.error("Obra y destinatario son obligatorios");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("deal_memos")
      .insert({ referencia: nextRef, obra: obra.trim(), destinatario_final_email: email.trim(), descripcion_uso: descripcion.trim() || null })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "No se pudo crear"); return; }
    await supabase.from("deal_memo_eventos").insert({ deal_memo_id: data.id, tipo_evento: "creado", payload: { referencia: nextRef } });
    toast.success(`Creado ${nextRef}`);
    setObra(""); setEmail(""); setDescripcion("");
    onCreated(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo Deal Memo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Referencia (auto)</Label>
            <Input value={nextRef} disabled className="font-mono" />
          </div>
          <div>
            <Label className="text-xs">Obra *</Label>
            <Input value={obra} onChange={(e) => setObra(e.target.value)} placeholder="Ej. Documental Atlas" />
          </div>
          <div>
            <Label className="text-xs">Destinatario final (email) *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@productora.com" />
          </div>
          <div>
            <Label className="text-xs">Descripción del uso</Label>
            <Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Creando…" : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}