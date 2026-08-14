import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export function DealMemoDocument({ dm }: { dm: any }) {
  const versionsQ = useQuery({
    queryKey: ["dm-versions", dm.id],
    queryFn: async () => ((await supabase.from("deal_memo_versiones").select("*").eq("deal_memo_id", dm.id).order("numero_version", { ascending: false })).data ?? []),
  });
  const latest = versionsQ.data?.[0] as any | undefined;

  if (versionsQ.isLoading) return <Skeleton className="h-[520px] rounded-sm" />;
  if (!latest) {
    return (
      <div className="rounded-sm border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
        Todavía no hay un documento redactado para este deal memo.
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-[820px] rounded-sm border border-border bg-card p-6 shadow-sm md:p-8">
      <div className="mb-6 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs text-muted-foreground">{dm.referencia} · v{latest.numero_version}</p>
          <span className="text-xs text-muted-foreground">{latest.generada_por === "agente_ia" ? "Redactado por AIDA" : "Corrección humana"}</span>
        </div>
        <h1 className="mt-3 font-display text-2xl leading-tight">{latest.email_asunto}</h1>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-foreground">{latest.email_cuerpo}</pre>
    </article>
  );
}
