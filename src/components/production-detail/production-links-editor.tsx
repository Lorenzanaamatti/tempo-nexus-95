import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreatableSelect } from "@/components/creatable-select";
import { Label } from "@/components/ui/label";
import { additionalEntities, entitiesToAdd, isEntityLinked } from "@/lib/production-links";
import { toast } from "sonner";
import { X } from "lucide-react";

const db = supabase as any;

/** Configuración de un vínculo múltiple producción ↔ ficha del CRM. */
export type ProductionLinkConfig = {
  /** Tabla de vínculo (p. ej. production_partner_companies). */
  linkTable: string;
  /** Columna del vínculo que apunta a la ficha (p. ej. company_id). */
  linkFk: string;
  /** Tabla del CRM donde se buscan o crean las fichas. */
  crmTable: string;
  /** Columna del CRM con el nombre visible. */
  crmNameColumn: string;
  crmQueryKey: string[];
  linkQueryKey: string[];
  label: string;
  placeholder: string;
  createLabel: string;
  createdToast: string;
  alreadyText: string;
  removeTitle: string;
  emptyText: string;
  /** Consultas extra que hay que refrescar al cambiar los vínculos. */
  invalidate?: string[][];
};

export type LinkRow = { id: string; name: string | null; is_primary: boolean; [k: string]: any };

/** Vínculos de una producción con una ficha del CRM (principal + adicionales). */
export function useProductionLinks(productionId: string, cfg: ProductionLinkConfig) {
  return useQuery({
    queryKey: [...cfg.linkQueryKey, productionId],
    queryFn: async () => {
      const { data, error } = await db
        .from(cfg.linkTable)
        .select(`id, ${cfg.linkFk}, is_primary, ${cfg.crmTable}(${cfg.crmNameColumn})`)
        .eq("production_id", productionId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        [cfg.linkFk]: r[cfg.linkFk],
        is_primary: !!r.is_primary,
        name: r[cfg.crmTable]?.[cfg.crmNameColumn] ?? null,
      })) as LinkRow[];
    },
  });
}

/**
 * Fichas vinculadas a la producción: la principal se edita arriba y aquí se
 * añaden o quitan las demás. Sirve para productoras, direcciones, etc.
 */
export function ProductionLinksEditor({
  productionId,
  primaryId,
  primaryName,
  cfg,
}: {
  productionId: string;
  primaryId: string | null;
  primaryName: string | null;
  cfg: ProductionLinkConfig;
}) {
  const qc = useQueryClient();
  const linksQ = useProductionLinks(productionId, cfg);
  const crmQ = useQuery({
    queryKey: cfg.crmQueryKey,
    queryFn: async () => {
      const { data, error } = await db
        .from(cfg.crmTable)
        .select(`id, ${cfg.crmNameColumn}`)
        .order(cfg.crmNameColumn);
      if (error) throw error;
      // Se guardan las filas tal cual: otras pantallas comparten esta misma clave.
      return data ?? [];
    },
  });

  const links = linksQ.data ?? [];
  const fk = (l: LinkRow) => (l[cfg.linkFk] as string) ?? null;
  const extras = additionalEntities(links, fk, (l) => l.name, primaryId);
  const crmItems = (crmQ.data ?? []).map((r: any) => ({ id: r.id, name: (r[cfg.crmNameColumn] as string) ?? "" }));
  const options = entitiesToAdd(crmItems, links, fk, primaryId).map((c) => ({ id: c.id, label: c.name }));

  function refresh() {
    qc.invalidateQueries({ queryKey: [...cfg.linkQueryKey, productionId] });
    for (const key of cfg.invalidate ?? []) qc.invalidateQueries({ queryKey: key });
  }

  async function add(id: string) {
    if (!id) return;
    if (isEntityLinked(id, links, fk, primaryId)) {
      toast.message(cfg.alreadyText);
      return;
    }
    const { error } = await db
      .from(cfg.linkTable)
      .insert({ production_id: productionId, [cfg.linkFk]: id, is_primary: false });
    if (error) return toast.error(error.message);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await db.from(cfg.linkTable).delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function create(label: string): Promise<string | null> {
    const { data, error } = await db
      .from(cfg.crmTable)
      .insert({ [cfg.crmNameColumn]: label })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    qc.invalidateQueries({ queryKey: cfg.crmQueryKey });
    toast.success(cfg.createdToast);
    return data.id as string;
  }

  return (
    <div className="space-y-2">
      <Label>{cfg.label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {primaryId && primaryName && (
          <span className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted/50 px-2 py-1 text-sm">
            <span className="font-display">{primaryName}</span>
            <span className="smallcaps text-[10px] text-muted-foreground">principal</span>
          </span>
        )}
        {extras.map((l) => (
          <span key={l.id} className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-sm">
            <span>{l.name ?? "—"}</span>
            <button
              type="button"
              onClick={() => void remove(l.id)}
              title={cfg.removeTitle}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {!primaryId && !extras.length && (
          <span className="text-sm text-muted-foreground">{cfg.emptyText}</span>
        )}
      </div>
      <CreatableSelect
        value=""
        options={options}
        placeholder={cfg.placeholder}
        onPick={(id) => void add(id)}
        onCreate={create}
        createLabel={cfg.createLabel}
      />
    </div>
  );
}
