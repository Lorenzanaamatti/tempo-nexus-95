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
} from "@/lib/target-accounts-constants";

export const Route = createFileRoute("/_authenticated/_admin/marketing/target-accounts/")({
  component: TargetAccountsIndex,
});

import { formatDateEs as fmtDate } from "@/lib/dates";

function TargetAccountsIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["target-accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("target_accounts")
        .select(
          "id, name, status, priority, next_step, next_step_date, last_contact_date, decks_sent, sector, website, production_company:production_companies(name), responsible:people!target_accounts_responsible_person_id_fkey(full_name)",
        )
        .order("priority", { ascending: true })
        .order("next_step_date", { ascending: true, nullsFirst: false });
      if (error) {
        // FK alias may not exist; fall back to a simpler select
        const fb = await (supabase as any)
          .from("target_accounts")
          .select("id, name, status, priority, next_step, next_step_date, last_contact_date, decks_sent, sector, website, responsible_person_id, production_company_id")
          .order("priority", { ascending: true });
        if (fb.error) throw fb.error;
        return fb.data ?? [];
      }
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = (data ?? []) as any[];
    return list.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = [a.name, a.sector, a.next_step, a.production_company?.name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, statusFilter]);

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
              <section key={s} className="glass-panel rounded-sm p-4">
                <header className="mb-3 flex items-baseline justify-between border-b border-border pb-2">
                  <h2 className="font-display text-xl">{TARGET_ACCOUNT_STATUS_LABEL[s]}</h2>
                  <span className="smallcaps text-muted-foreground">{list.length}</span>
                </header>
                {!list.length ? (
                  <p className="text-xs text-muted-foreground">Sin cuentas en este estado.</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((a) => (
                      <li key={a.id}>
                        <Link
                          to="/marketing/target-accounts/$accountId"
                          params={{ accountId: a.id }}
                          className="block rounded-sm border border-border bg-card/50 p-3 transition hover:border-primary/60"
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