import { ExportRowsButton } from "@/components/export-rows-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { EmptyState, ListSkeleton } from "@/components/list-states";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateEs } from "@/lib/dates";
import { CONTRATO_TIPOS, IC_ROLES, optionLabel } from "@/lib/comunicacion-model";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/empresa/equipo/")({
  component: EquipoIndex,
});

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function EquipoIndex() {
  const { isBigC, loading } = useCurrentRole();

  const { data, isLoading } = useQuery({
    queryKey: ["equipo-ic-humano"],
    queryFn: async () => {
      const { data: people, error } = await db
        .from("people")
        .select("id, full_name, last_name, email, phone, ic_roles, contract_type, contract_start, photo_path")
        .eq("role", "ic_team")
        .eq("is_virtual_assistant", false)
        .order("full_name");
      if (error) throw error;
      const rows = (people ?? []) as Record<string, any>[];
      const [{ data: composers }, { data: actions }] = await Promise.all([
        db.from("composers").select("id, agent_person_id"),
        db.from("actions").select("assignee_person_id, done"),
      ]);
      return rows.map((p): Record<string, any> => ({
        ...p,
        representados: (composers ?? []).filter((c: any) => c.agent_person_id === p.id).length,
        pendientes: (actions ?? []).filter((a: any) => a.assignee_person_id === p.id && !a.done).length,
      }));
    },
    enabled: isBigC,
  });

  if (loading) return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  if (!isBigC) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <EmptyState title="Sin acceso" description="Esta sección solo está disponible para BIG C." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Empresa</p>
        <h1 className="mt-1 font-display text-5xl title-caps">Equipo IC</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Equipo humano de Interesante Compañía. Los agentes IA se gestionan en <Link to="/empresa/agentes" className="underline">Agentes IA</Link>.
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : !data?.length ? (
        <EmptyState title="Sin personas" description="Añade personas al equipo desde el directorio interno." action={{ label: "Ir al directorio", to: "/people" }} />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                {["", "Nombre", "Rol", "Tipo de contrato", "Inicio", "Representados", "Tareas pendientes"].map((h) => (
                  <th key={h} className="px-3 py-2 smallcaps text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Avatar className="h-8 w-8 rounded-sm">
                      <AvatarFallback className="rounded-sm text-[10px]">{initials(p.full_name ?? "")}</AvatarFallback>
                    </Avatar>
                  </td>
                  <td className="px-3 py-2 font-display">
                    <Link to="/empresa/equipo/$personId" params={{ personId: p.id }} className="hover:underline">
                      {[p.full_name, p.last_name].filter(Boolean).join(" ")}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap gap-1">
                      {(p.ic_roles ?? []).length
                        ? (p.ic_roles as string[]).map((r) => (
                            <Badge key={r} variant="outline" className="rounded-sm text-[10px]">{optionLabel(IC_ROLES, r)}</Badge>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{optionLabel(CONTRATO_TIPOS, p.contract_type)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDateEs(p.contract_start)}</td>
                  <td className="px-3 py-2 tabular-nums">{p.representados}</td>
                  <td className="px-3 py-2 tabular-nums">{p.pendientes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
