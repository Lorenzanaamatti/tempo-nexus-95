import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { EmptyState, ListSkeleton } from "@/components/list-states";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeEs } from "@/lib/dates";
import { AGENTES_IA } from "@/lib/comunicacion-model";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/empresa/agentes")({
  component: AgentesPage,
});

function monthStartIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function AgentesPage() {
  const { isBigC, loading } = useCurrentRole();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["empresa-agentes"],
    queryFn: async () => {
      const { data: agents, error } = await db
        .from("people")
        .select("id, full_name, agent_description, agent_active, agent_last_used_at")
        .eq("is_virtual_assistant", true)
        .in("full_name", AGENTES_IA as unknown as string[])
        .order("full_name");
      if (error) throw error;
      const { data: acts } = await db
        .from("agent_actions")
        .select("agent_person_id, status, requested_at, decided_at");
      const since = monthStartIso();
      return (agents ?? []).map((a: any) => {
        const mine = (acts ?? []).filter((x: any) => x.agent_person_id === a.id);
        const thisMonth = mine.filter((x: any) => (x.decided_at ?? x.requested_at) >= since);
        return {
          ...a,
          total: mine.filter((x: any) => x.status === "approved").length,
          mes: thisMonth.filter((x: any) => x.status === "approved").length,
          pendientes: mine.filter((x: any) => x.status === "pending").length,
          rechazos: thisMonth.filter((x: any) => x.status === "rejected").length,
          ultimo: a.agent_last_used_at ?? mine.map((x: any) => x.requested_at).sort().at(-1) ?? null,
        };
      });
    },
    enabled: isBigC,
  });

  async function toggle(id: string, value: boolean) {
    const { error } = await db.from("people").update({ agent_active: value }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["empresa-agentes"] });
  }

  if (loading) return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  if (!isBigC) {
    return <div className="mx-auto max-w-[1400px] px-6 py-10"><EmptyState title="Sin acceso" description="Esta sección solo está disponible para BIG C." /></div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Empresa</p>
        <h1 className="mt-1 font-display text-5xl title-caps">Agentes IA</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          AIDA, AINARA, AITANA y AITOR. El equipo humano se gestiona en <Link to="/empresa/equipo" className="underline">Equipo IC</Link>.
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} variant="cards" />
      ) : !data?.length ? (
        <EmptyState title="Sin agentes" description="No hay agentes IA configurados." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((a: any) => (
            <div key={a.id} className="rounded-sm border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-2xl title-caps">
                    <Sparkles className="h-5 w-5 text-primary" /> {a.full_name}
                  </h2>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">{a.agent_description ?? "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Switch checked={!!a.agent_active} onCheckedChange={(v) => toggle(a.id, v)} />
                  <Badge variant="outline" className="rounded-sm text-[10px]">{a.agent_active ? "Activo" : "Inactivo"}</Badge>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Último uso" value={formatDateTimeEs(a.ultimo)} />
                <Stat label="Tareas completadas (total / mes)" value={`${a.total} / ${a.mes}`} />
                <Stat label="Validaciones pendientes" value={String(a.pendientes)} />
                <Stat label="Rechazos este mes" value={String(a.rechazos)} />
              </dl>

              <div className="mt-4 flex gap-2">
                <Button size="sm" asChild>
                  <Link to="/empresa/agentes/$agentId" params={{ agentId: a.id }}>Ver log completo</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/agent-actions">Cola de validación</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border px-3 py-2">
      <dt className="smallcaps text-[10px] text-muted-foreground">{label}</dt>
      <dd className="font-display text-lg">{value}</dd>
    </div>
  );
}
