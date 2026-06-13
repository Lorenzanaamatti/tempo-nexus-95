import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AGENT_TOOLS, type AgentToolDef } from "@/lib/agent-tools";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AREA_LABEL: Record<AgentToolDef["area"], string> = {
  legal: "Legal",
  calendario: "Calendario",
  roster: "Roster",
  produccion: "Producción",
  finanzas: "Finanzas",
};

export function AgentToolsEditor({ personId }: { personId: string }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("agent_tools")
        .select("tool_name")
        .eq("agent_person_id", personId)
        .eq("enabled", true);
      setEnabled(new Set((data ?? []).map((r: any) => r.tool_name as string)));
      setLoading(false);
    })();
  }, [personId]);

  async function toggle(name: string, on: boolean) {
    const next = new Set(enabled);
    if (on) next.add(name);
    else next.delete(name);
    setEnabled(next);
    if (on) {
      const { error } = await (supabase as any)
        .from("agent_tools")
        .upsert({ agent_person_id: personId, tool_name: name, enabled: true });
      if (error) toast.error(error.message);
    } else {
      const { error } = await (supabase as any)
        .from("agent_tools")
        .delete()
        .eq("agent_person_id", personId)
        .eq("tool_name", name);
      if (error) toast.error(error.message);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando herramientas…</p>;

  const groups = AGENT_TOOLS.reduce<Record<string, AgentToolDef[]>>((acc, t) => {
    (acc[t.area] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <p className="text-[11px] text-muted-foreground">
        Marca las herramientas que este agente puede usar dentro del chat. Las marcadas como{" "}
        <Badge variant="outline" className="rounded-sm text-[9px]">propuesta</Badge> generan
        propuestas que un verificador debe aprobar antes de ejecutarse.
      </p>
      {Object.entries(groups).map(([area, items]) => (
        <div key={area}>
          <div className="smallcaps mb-2 text-[10px] text-muted-foreground">
            {AREA_LABEL[area as AgentToolDef["area"]] ?? area}
          </div>
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.name} className="flex items-start gap-3 rounded-sm border border-border bg-card/30 p-3">
                <Checkbox
                  id={`tool-${t.name}`}
                  checked={enabled.has(t.name)}
                  onCheckedChange={(v) => toggle(t.name, !!v)}
                />
                <div className="flex-1">
                  <label htmlFor={`tool-${t.name}`} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    {t.label}
                    {t.kind === "write" ? (
                      <Badge variant="outline" className="rounded-sm text-[9px]">propuesta</Badge>
                    ) : (
                      <Badge variant="secondary" className="rounded-sm text-[9px]">solo lectura</Badge>
                    )}
                  </label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}