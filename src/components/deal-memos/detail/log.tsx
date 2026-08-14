import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatDateEs } from "@/lib/dates";
import { EVENTO_LABEL } from "@/lib/deal-memo-constants";

export function DealMemoLog({ dealMemoId }: { dealMemoId: string }) {
  const q = useQuery({
    queryKey: ["dm-events", dealMemoId],
    queryFn: async () => ((await supabase.from("deal_memo_eventos").select("*").eq("deal_memo_id", dealMemoId).order("created_at", { ascending: false })).data ?? []),
  });
  if (q.isLoading) return <Skeleton className="h-40" />;
  const events = q.data ?? [];
  if (events.length === 0) return <div className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground"><Clock className="mx-auto mb-2 h-6 w-6 opacity-50" />Sin eventos</div>;
  return (
    <ol className="relative space-y-3 border-l border-border pl-6">
      {events.map((e: any) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[29px] mt-1.5 h-2.5 w-2.5 rounded-full bg-foreground" />
          <div className="rounded-sm border border-border bg-card p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{EVENTO_LABEL[e.tipo_evento as keyof typeof EVENTO_LABEL] ?? e.tipo_evento}</p>
              <span className="text-[10px] text-muted-foreground">{formatDateEs(e.created_at)} · {formatDistanceToNow(new Date(e.created_at), { locale: es, addSuffix: true })}</span>
            </div>
            {e.actor_email && <p className="mt-0.5 text-xs text-muted-foreground">{e.actor_email}</p>}
            {e.payload && Object.keys(e.payload).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground">Detalles</summary>
                <pre className="mt-1 overflow-x-auto rounded-sm bg-muted p-2 text-[11px]">{JSON.stringify(e.payload, null, 2)}</pre>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
