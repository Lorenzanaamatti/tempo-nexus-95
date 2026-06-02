import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { FinanceDashboard } from "@/components/finance-dashboard";

const searchSchema = z.object({ composerId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/_admin/finance")({
  validateSearch: (s) => searchSchema.parse(s),
  component: FinancePage,
});

function FinancePage() {
  const { composerId } = Route.useSearch();
  const composerQ = useQuery({
    queryKey: ["finance-composer", composerId ?? null],
    enabled: !!composerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composers")
        .select("full_name, artistic_name")
        .eq("id", composerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const title = composerId
    ? `Dashboard económico · ${composerQ.data?.artistic_name || composerQ.data?.full_name || ""}`
    : "Dashboard económico de IC";
  const eyebrow = composerId ? "Compositor" : "Compañía";
  const description = composerId
    ? "Previsto, facturado y cobrado de las producciones donde este compositor está asignado."
    : "Previsto, facturado y cobrado consolidando todos los sprints de producción.";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="smallcaps text-muted-foreground">{eyebrow}</p>
        <h1 className="font-display text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </header>
      <FinanceDashboard composerId={composerId ?? null} />
    </div>
  );
}