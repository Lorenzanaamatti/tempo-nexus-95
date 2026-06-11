import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type IcTeamFunction =
  | "equipo_virtual"
  | "direccion_general"
  | "agente"
  | "manager"
  | "produccion"
  | "post_produccion"
  | "legal"
  | "legal_externo"
  | "validacion_contratos_deal_memos"
  | "onboarding_clientes"
  | "discografica"
  | "editorial"
  | "ai_reminder"
  | "ai_deal_memos"
  | "ai_contratos"
  | "ai_facturacion"
  | "ai_cobros"
  | "ai_calendarios_preavisos"
  | "ai_control_agentes_ai"
  | "ai_envia_presus_productoras"
  | "administracion"
  | "contabilidad"
  | "fiscal"
  | "pagos_y_cobros"
  | "bancos_y_tesoreria"
  | "facturacion"
  | "diseno"
  | "marketing"
  | "comunicacion"
  | "paid_media"
  | "analytics"
  | "prensa"
  | "pr"
  | "institucional"
  | "editores"
  | "sellos"
  | "reels_background_av"
  | "fotos_videos_clientes"
  | "seguimiento_producciones";

export const IC_FUNCTION_GROUPS: { label: string; items: { value: IcTeamFunction; label: string }[] }[] = [
  {
    label: "Dirección y operaciones",
    items: [
      { value: "equipo_virtual", label: "Equipo Virtual" },
      { value: "direccion_general", label: "Dirección General" },
      { value: "agente", label: "Agente" },
      { value: "produccion", label: "Producción" },
      { value: "post_produccion", label: "Post producción" },
      { value: "seguimiento_producciones", label: "Seguimiento producciones" },
      { value: "onboarding_clientes", label: "Onboarding clientes" },
    ],
  },
  {
    label: "Legal",
    items: [
      { value: "legal", label: "Legal" },
      { value: "legal_externo", label: "Legal externo" },
      { value: "validacion_contratos_deal_memos", label: "Validación contratos y deal memos" },
    ],
  },
  {
    label: "Discográfica / Editorial",
    items: [
      { value: "discografica", label: "Discográfica" },
      { value: "editorial", label: "Editorial" },
      { value: "editores", label: "Editores" },
      { value: "sellos", label: "Sellos" },
    ],
  },
  {
    label: "Agentes IA",
    items: [
      { value: "ai_reminder", label: "AI Reminder" },
      { value: "ai_deal_memos", label: "AI Deal Memos" },
      { value: "ai_contratos", label: "AI Contratos" },
      { value: "ai_facturacion", label: "AI Facturación" },
      { value: "ai_cobros", label: "AI Cobros" },
      { value: "ai_calendarios_preavisos", label: "AI Calendarios y preavisos" },
      { value: "ai_control_agentes_ai", label: "AI Control de agentes AI" },
      { value: "ai_envia_presus_productoras", label: "AI envía presus a productoras" },
    ],
  },
  {
    label: "Administración y finanzas",
    items: [
      { value: "administracion", label: "Administración" },
      { value: "contabilidad", label: "Contabilidad" },
      { value: "fiscal", label: "Fiscal" },
      { value: "pagos_y_cobros", label: "Pagos y cobros" },
      { value: "bancos_y_tesoreria", label: "Bancos y tesorería" },
      { value: "facturacion", label: "Facturación" },
    ],
  },
  {
    label: "Marketing y comunicación",
    items: [
      { value: "marketing", label: "Marketing" },
      { value: "comunicacion", label: "Comunicación" },
      { value: "paid_media", label: "Paid Media" },
      { value: "analytics", label: "Analytics" },
      { value: "prensa", label: "Prensa" },
      { value: "pr", label: "PR" },
      { value: "institucional", label: "Institucional" },
      { value: "diseno", label: "Diseño" },
      { value: "reels_background_av", label: "Reels y background audiovisual" },
      { value: "fotos_videos_clientes", label: "Fotos y vídeos clientes" },
    ],
  },
];

export const IC_FUNCTION_LABEL: Record<IcTeamFunction, string> = Object.fromEntries(
  IC_FUNCTION_GROUPS.flatMap((g) => g.items).map((i) => [i.value, i.label]),
) as Record<IcTeamFunction, string>;

export function PersonIcFunctionsEditor({ personId }: { personId: string }) {
  const [selected, setSelected] = useState<Set<IcTeamFunction>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await (supabase as any)
        .from("person_ic_functions")
        .select("function")
        .eq("person_id", personId);
      if (cancelled) return;
      if (!error && data) setSelected(new Set(data.map((d: { function: IcTeamFunction }) => d.function)));
      setLoading(false);
    }
    setLoading(true);
    load();
    const onRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail as { personId?: string } | undefined;
      if (!detail || detail.personId === personId) load();
    };
    window.addEventListener("person-ic-functions:refresh", onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("person-ic-functions:refresh", onRefresh);
    };
  }, [personId]);

  async function toggle(fn: IcTeamFunction) {
    const next = new Set(selected);
    if (next.has(fn)) {
      next.delete(fn);
      const { error } = await (supabase as any)
        .from("person_ic_functions")
        .delete()
        .eq("person_id", personId)
        .eq("function", fn);
      if (error) return toast.error(error.message);
    } else {
      next.add(fn);
      const { error } = await (supabase as any)
        .from("person_ic_functions")
        .insert({ person_id: personId, function: fn });
      if (error) return toast.error(error.message);
    }
    setSelected(next);
  }

  if (loading) return <div className="text-sm text-muted-foreground">Cargando funciones…</div>;

  return (
    <div className="space-y-6">
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/30 p-3">
          {Array.from(selected).map((fn) => (
            <Badge key={fn} variant="secondary" className="gap-1 rounded-sm">
              {IC_FUNCTION_LABEL[fn]}
              <button onClick={() => toggle(fn)} className="ml-1 opacity-60 hover:opacity-100" aria-label={`Quitar ${IC_FUNCTION_LABEL[fn]}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {IC_FUNCTION_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="smallcaps mb-2 text-xs text-muted-foreground">{group.label}</div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => {
              const active = selected.has(item.value);
              return (
                <Button
                  key={item.value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={cn("h-8 rounded-sm", active && "")}
                  onClick={() => toggle(item.value)}
                >
                  {active && <Check className="mr-1 h-3 w-3" />}
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}