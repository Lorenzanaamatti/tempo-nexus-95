import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreatableSelect } from "@/components/creatable-select";
import { Label } from "@/components/ui/label";
import { additionalCompanies, companiesToAdd, isCompanyLinked, type CompanyLink } from "@/lib/production-companies";
import { toast } from "sonner";
import { X } from "lucide-react";

const db = supabase as any;

/** Productoras vinculadas a una producción (principal + adicionales). */
export function useProductionCompanies(productionId: string) {
  return useQuery({
    queryKey: ["production-companies-link", productionId],
    queryFn: async () => {
      const { data, error } = await db
        .from("production_partner_companies")
        .select("id, company_id, is_primary, production_companies(name)")
        .eq("production_id", productionId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        company_id: r.company_id,
        is_primary: !!r.is_primary,
        name: r.production_companies?.name ?? null,
      })) as CompanyLink[];
    },
  });
}

/**
 * Productoras de la producción: la principal se edita arriba (Cliente / Productora)
 * y aquí se añaden o quitan las demás.
 */
export function ProductionCompaniesEditor({
  productionId,
  primaryCompanyId,
  primaryCompanyName,
}: {
  productionId: string;
  primaryCompanyId: string | null;
  primaryCompanyName: string | null;
}) {
  const qc = useQueryClient();
  const linksQ = useProductionCompanies(productionId);
  const companiesQ = useQuery({
    queryKey: ["production-companies-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_companies").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const links = linksQ.data ?? [];
  const extras = additionalCompanies(links, primaryCompanyId);
  const options = companiesToAdd(companiesQ.data ?? [], links, primaryCompanyId).map((c: any) => ({ id: c.id, label: c.name }));

  async function add(companyId: string) {
    if (!companyId) return;
    if (isCompanyLinked(companyId, links, primaryCompanyId)) {
      toast.message("Esa productora ya está en la ficha");
      return;
    }
    const { error } = await db
      .from("production_partner_companies")
      .insert({ production_id: productionId, company_id: companyId, is_primary: false });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["production-companies-link", productionId] });
    qc.invalidateQueries({ queryKey: ["partner-productions"] });
  }

  async function remove(id: string) {
    const { error } = await db.from("production_partner_companies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["production-companies-link", productionId] });
    qc.invalidateQueries({ queryKey: ["partner-productions"] });
  }

  async function createCompany(label: string): Promise<string | null> {
    const { data, error } = await db.from("production_companies").insert({ name: label }).select("id").single();
    if (error) { toast.error(error.message); return null; }
    qc.invalidateQueries({ queryKey: ["production-companies-mini"] });
    toast.success("Productora creada en el CRM");
    return data.id as string;
  }

  return (
    <div className="space-y-2">
      <Label>Productoras (puede haber varias)</Label>
      <div className="flex flex-wrap items-center gap-2">
        {primaryCompanyId && primaryCompanyName && (
          <span className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted/50 px-2 py-1 text-sm">
            <span className="font-display">{primaryCompanyName}</span>
            <span className="smallcaps text-[10px] text-muted-foreground">principal</span>
          </span>
        )}
        {extras.map((l) => (
          <span key={l.id} className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-sm">
            <span>{l.name ?? "—"}</span>
            <button
              type="button"
              onClick={() => void remove(l.id)}
              title="Quitar productora"
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {!primaryCompanyId && !extras.length && (
          <span className="text-sm text-muted-foreground">Sin productoras vinculadas.</span>
        )}
      </div>
      <CreatableSelect
        value=""
        options={options}
        placeholder="Añadir otra productora…"
        onPick={(id) => void add(id)}
        onCreate={createCompany}
        createLabel="Crear productora"
      />
    </div>
  );
}
