import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  TARGET_ACCOUNT_STATUSES,
  TARGET_ACCOUNT_STATUS_LABEL,
  TARGET_ACCOUNT_STATUS_TONE,
  TARGET_ACCOUNT_PRIORITY_LABEL,
  TARGET_ACCOUNT_PRIORITY_TONE,
  type TargetAccountStatus,
  type TargetAccountPriority,
  TARGET_ACCOUNT_TYPES,
  TARGET_ACCOUNT_TYPE_LABEL,
  TARGET_ACCOUNT_TYPE_TONE,
  TARGET_ACCOUNT_ROSTER_KIND_LABEL,
  type TargetAccountType,
  type TargetAccountRosterKind,
} from "@/lib/target-accounts-constants";

export const Route = createFileRoute("/_authenticated/_admin/marketing/target-accounts/")({
  component: TargetAccountsIndex,
});

import { formatDateEs as fmtDate } from "@/lib/dates";

function TargetAccountsIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TargetAccountStatus | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["target-accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("target_accounts")
        .select(
          "id, name, status, priority, account_type, roster_kind, other_label, next_step, next_step_date, last_contact_date, decks_sent, sector, website, production_company:production_companies(name), responsible:people!target_accounts_responsible_person_id_fkey(full_name)",
        )
        .order("priority", { ascending: true })
        .order("next_step_date", { ascending: true, nullsFirst: false });
      if (error) {
        // FK alias may not exist; fall back to a simpler select
        const fb = await (supabase as any)
          .from("target_accounts")
          .select("id, name, status, priority, account_type, roster_kind, other_label, next_step, next_step_date, last_contact_date, decks_sent, sector, website, responsible_person_id, production_company_id")
          .order("priority", { ascending: true });
        if (fb.error) throw fb.error;
        return fb.data ?? [];
      }
      return data ?? [];
    },
  });

  const searched = useMemo(() => {
    const list = (data ?? []) as any[];
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((a) => {
      const hay = [a.name, a.sector, a.next_step, a.production_company?.name, a.other_label]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [data, q]);

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of TARGET_ACCOUNT_TYPES) map.set(t, 0);
    for (const a of searched) {
      // count over search + status filter (so counts reflect current view minus the type facet)
      if (statusFilter !== "all" && a.status !== statusFilter) continue;
      const t = (a.account_type ?? "productora") as string;
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return map;
  }, [searched, statusFilter]);

  const statusCounts = useMemo(() => {
    const map = new Map<TargetAccountStatus, number>();
    for (const s of TARGET_ACCOUNT_STATUSES) map.set(s, 0);
    for (const a of searched) {
      if (typeFilter !== "all" && (a.account_type ?? "productora") !== typeFilter) continue;
      const s = a.status as TargetAccountStatus;
      if (map.has(s)) map.set(s, (map.get(s) ?? 0) + 1);
    }
    return map;
  }, [searched, typeFilter]);

  const filtered = useMemo(() => {
    return searched.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (typeFilter !== "all" && (a.account_type ?? "productora") !== typeFilter) return false;
      return true;
    });
  }, [searched, statusFilter, typeFilter]);

  const buckets = useMemo(() => {
    const map = new Map<TargetAccountStatus, any[]>();
    for (const s of TARGET_ACCOUNT_STATUSES) map.set(s, []);
    for (const a of filtered) {
      const list = map.get(a.status as TargetAccountStatus);
      if (list) list.push(a);
    }
    return map;
  }, [filtered]);

  async function createAccount() {
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await (supabase as any)
      .from("target_accounts")
      .insert({ name: newName.trim() });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewName("");
    toast.success("Cuenta añadida");
    qc.invalidateQueries({ queryKey: ["target-accounts"] });
  }

  async function moveAccount(accountId: string, newStatus: TargetAccountStatus) {
    const current = (data ?? []) as any[];
    const acc = current.find((a) => a.id === accountId);
    if (!acc || acc.status === newStatus) return;
    // optimistic update
    qc.setQueryData(["target-accounts"], (old: any) => {
      const list = (old ?? []) as any[];
      return list.map((a) => (a.id === accountId ? { ...a, status: newStatus } : a));
    });
    const { error } = await (supabase as any)
      .from("target_accounts")
      .update({ status: newStatus })
      .eq("id", accountId);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["target-accounts"] });
      return;
    }
    toast.success(`Movida a "${TARGET_ACCOUNT_STATUS_LABEL[newStatus]}"`);
    qc.invalidateQueries({ queryKey: ["target-accounts"] });
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Marketing y Ventas</p>
          <h1 className="mt-1 font-display text-5xl">Cuentas objetivo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Empresas, plataformas y marcas en las que IC quiere entrar. Cada cuenta tiene estado, responsable interno y próximo paso. Cuando aparece un encargo concreto, se convierte en una Oportunidad.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva cuenta objetivo (nombre)…"
          className="w-72 rounded-sm"
          onKeyDown={(e) => { if (e.key === "Enter") createAccount(); }}
        />
        <Button size="sm" onClick={createAccount} disabled={creating || !newName.trim()}>
          <Plus className="mr-1 h-4 w-4" /> Añadir
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, sector, próximo paso…"
            className="w-72 rounded-sm"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 rounded-sm">
              <SelectValue placeholder="Tipología" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las tipologías</SelectItem>
              {TARGET_ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{TARGET_ACCOUNT_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52 rounded-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {TARGET_ACCOUNT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{TARGET_ACCOUNT_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="smallcaps mr-1 text-xs text-muted-foreground">Tipología</span>
        <button
          type="button"
          onClick={() => setTypeFilter("all")}
          className={`rounded-sm border px-2.5 py-1 text-xs transition ${typeFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card/40 hover:border-primary/60"}`}
        >
          Todas <span className="ml-1 text-muted-foreground">{searched.length}</span>
        </button>
        {TARGET_ACCOUNT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
            className={`rounded-sm border px-2.5 py-1 text-xs transition ${typeFilter === t ? "border-primary bg-primary/10 text-primary" : `${TARGET_ACCOUNT_TYPE_TONE[t]} hover:border-primary/60`}`}
          >
            {TARGET_ACCOUNT_TYPE_LABEL[t]} <span className="ml-1 opacity-70">{typeCounts.get(t) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="smallcaps mr-1 text-xs text-muted-foreground">Estado</span>
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`rounded-sm border px-2.5 py-1 text-xs transition ${statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card/40 hover:border-primary/60"}`}
        >
          Todos <span className="ml-1 text-muted-foreground">{searched.length}</span>
        </button>
        {TARGET_ACCOUNT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={`rounded-sm border px-2.5 py-1 text-xs transition ${statusFilter === s ? "border-primary bg-primary/10 text-primary" : `${TARGET_ACCOUNT_STATUS_TONE[s]} hover:border-primary/60`}`}
          >
            {TARGET_ACCOUNT_STATUS_LABEL[s]} <span className="ml-1 opacity-70">{statusCounts.get(s) ?? 0}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando cuentas…</p>
      ) : !filtered.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <p className="font-display text-2xl">Aún no hay cuentas objetivo.</p>
          <p className="mt-2 text-sm text-muted-foreground">Añade la primera arriba para empezar el pipeline.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {TARGET_ACCOUNT_STATUSES.map((s) => {
            const list = buckets.get(s) ?? [];
            if (!list.length && statusFilter !== "all" && statusFilter !== s) return null;
            return (
              <section
                key={s}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStatus(s); }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverStatus(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  setDragOverStatus(null);
                  setDraggingId(null);
                  if (id) moveAccount(id, s);
                }}
                className={`glass-panel rounded-sm p-4 transition ${dragOverStatus === s ? "ring-2 ring-primary/60 bg-primary/5" : ""}`}
              >
                <header className="mb-3 flex items-baseline justify-between border-b border-border pb-2">
                  <h2 className="font-display text-xl">{TARGET_ACCOUNT_STATUS_LABEL[s]}</h2>
                  <span className="smallcaps text-muted-foreground">{list.length}</span>
                </header>
                {!list.length ? (
                  <p className="text-xs text-muted-foreground">Sin cuentas en este estado. Arrastra una tarjeta aquí.</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((a) => (
                      <li
                        key={a.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", a.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingId(a.id);
                        }}
                        onDragEnd={() => { setDraggingId(null); setDragOverStatus(null); }}
                        className={draggingId === a.id ? "opacity-40" : ""}
                      >
                        <Link
                          to="/marketing/target-accounts/$accountId"
                          params={{ accountId: a.id }}
                          className="block cursor-grab rounded-sm border border-border bg-card/50 p-3 transition hover:border-primary/60 active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{a.name}</p>
                              {a.production_company?.name && (
                                <p className="truncate text-xs text-muted-foreground">{a.production_company.name}</p>
                              )}
                            </div>
                            <Badge variant="outline" className={`shrink-0 rounded-sm text-[10px] ${TARGET_ACCOUNT_PRIORITY_TONE[a.priority as TargetAccountPriority]}`}>
                              {TARGET_ACCOUNT_PRIORITY_LABEL[a.priority as TargetAccountPriority]}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="outline" className={`rounded-sm text-[10px] ${TARGET_ACCOUNT_TYPE_TONE[(a.account_type ?? "productora") as TargetAccountType]}`}>
                              {TARGET_ACCOUNT_TYPE_LABEL[(a.account_type ?? "productora") as TargetAccountType]}
                              {a.account_type === "roster" && a.roster_kind && (
                                <span className="ml-1 opacity-80">· {TARGET_ACCOUNT_ROSTER_KIND_LABEL[a.roster_kind as TargetAccountRosterKind]}</span>
                              )}
                              {a.account_type === "otros" && a.other_label && (
                                <span className="ml-1 opacity-80">· {a.other_label}</span>
                              )}
                            </Badge>
                          </div>
                          {a.next_step && (
                            <p className="mt-2 line-clamp-2 text-xs text-foreground/80">→ {a.next_step}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            {a.next_step_date && <span>Próx.: {fmtDate(a.next_step_date)}</span>}
                            {a.last_contact_date && <span>Últ.: {fmtDate(a.last_contact_date)}</span>}
                            {a.responsible?.full_name && <span>· {a.responsible.full_name}</span>}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Los estados se muestran como columnas de pipeline. Toca una cuenta para editar próximo paso, responsable, prioridad y notas.{" "}
        <Badge variant="outline" className={`ml-1 rounded-sm ${TARGET_ACCOUNT_STATUS_TONE.cliente_activo}`}>Cliente activo</Badge>
      </p>
    </div>
  );
}