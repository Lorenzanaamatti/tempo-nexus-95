import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatDateEs } from "@/lib/dates";

const ACTION_LABEL: Record<string, string> = {
  insert: "Ficha creada",
  update: "Campos modificados",
  delete: "Ficha eliminada",
};

/** Historial de cambios (quién modificó qué y cuándo) de una ficha crítica. */
export function AuditTrail({ table, recordId }: { table: string; recordId: string }) {
  const q = useQuery({
    queryKey: ["audit-log", table, recordId],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, action, changed_fields, old_values, new_values, actor_id, created_at")
        .eq("table_name", table)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = data ?? [];
      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
      const actors = actorIds.length
        ? (await supabase.from("profiles").select("id, email, full_name").in("id", actorIds)).data ?? []
        : [];
      const map = new Map(actors.map((a: any) => [a.id, a.full_name || a.email]));
      return rows.map((r) => ({ ...r, actor: r.actor_id ? map.get(r.actor_id) ?? null : null }));
    },
  });

  if (q.isLoading) return <Skeleton className="h-32" />;
  const rows = q.data ?? [];
  if (rows.length === 0)
    return (
      <div className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        <History className="mx-auto mb-2 h-5 w-5 opacity-50" />
        Sin cambios registrados
      </div>
    );

  return (
    <ol className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-sm border border-border bg-card p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{ACTION_LABEL[r.action] ?? r.action}</p>
            <span className="text-[10px] text-muted-foreground">
              {formatDateEs(r.created_at)} · {formatDistanceToNow(new Date(r.created_at), { locale: es, addSuffix: true })}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{r.actor ?? "Sistema"}</p>
          {r.changed_fields?.length > 0 && (
            <p className="mt-1 text-xs">
              <span className="text-muted-foreground">Campos: </span>
              {r.changed_fields.join(", ")}
            </p>
          )}
          {(r.old_values || r.new_values) && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground">Ver valores</summary>
              <pre className="mt-1 overflow-x-auto rounded-sm bg-muted p-2 text-[11px]">
                {JSON.stringify({ antes: r.old_values, despues: r.new_values }, null, 2)}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}
