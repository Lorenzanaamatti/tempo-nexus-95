import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { PARTNER_CATEGORY_LABEL, PARTNER_CATEGORY_TONE, parsePartnerKey } from "@/lib/partner-categories";

export const Route = createFileRoute("/_authenticated/_admin/partners/$partnerId")({
  component: PartnerDetail,
});

function PartnerDetail() {
  const { partnerId } = Route.useParams();
  const parsed = parsePartnerKey(partnerId);

  const detailQ = useQuery({
    queryKey: ["partner-detail", partnerId],
    enabled: !!parsed,
    queryFn: async () => {
      if (!parsed) return null;
      const { category, id } = parsed;
      if (category === "productora") {
        const { data, error } = await supabase.from("production_companies").select("id, name, city, country, email, website, notes").eq("id", id).maybeSingle();
        if (error) throw error;
        return data ? { name: data.name, meta: [data.city, data.country, data.email, data.website], notes: data.notes } : null;
      }
      if (category === "plataforma") {
        const { data, error } = await supabase.from("platforms").select("id, name, country, email, website, notes").eq("id", id).maybeSingle();
        if (error) throw error;
        return data ? { name: data.name, meta: [data.country, data.email, data.website], notes: data.notes } : null;
      }
      if (category === "director") {
        const { data, error } = await supabase.from("directors").select("id, full_name, country, email, website, notes").eq("id", id).maybeSingle();
        if (error) throw error;
        return data ? { name: data.full_name, meta: [data.country, data.email, data.website], notes: data.notes } : null;
      }
      const { data, error } = await (supabase as any).from("providers").select("id, name, city, country, email, website, notes").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? { name: data.name, meta: [data.city, data.country, data.email, data.website], notes: data.notes } : null;
    },
  });

  if (!parsed) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <EmptyState title="Partner no encontrado" description="El identificador del partner no es válido." />
      </div>
    );
  }

  const canonical =
    parsed.category === "productora"
      ? { to: "/production-companies/$companyId" as const, params: { companyId: parsed.id }, label: "Abrir ficha de productora" }
      : parsed.category === "director"
        ? { to: "/directors/$directorId" as const, params: { directorId: parsed.id }, label: "Abrir ficha de director" }
        : parsed.category === "plataforma"
          ? { to: "/platforms" as const, params: {}, label: "Abrir plataformas" }
          : { to: "/providers" as const, params: {}, label: "Abrir proveedores" };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="smallcaps text-muted-foreground">
        <Link to="/partners" className="hover:underline">Partners</Link> · {PARTNER_CATEGORY_LABEL[parsed.category]}
      </p>
      {detailQ.isLoading ? (
        <div className="mt-6"><ListSkeleton rows={3} /></div>
      ) : !detailQ.data ? (
        <EmptyState title="Partner no encontrado" description="Este registro ya no existe." />
      ) : (
        <>
          <h1 className="mt-1 font-display text-5xl title-caps">{detailQ.data.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${PARTNER_CATEGORY_TONE[parsed.category]}`}>
              {PARTNER_CATEGORY_LABEL[parsed.category]}
            </span>
            <span className="text-sm text-muted-foreground">{detailQ.data.meta.filter(Boolean).join(" · ")}</span>
          </div>
          {detailQ.data.notes && <p className="mt-6 whitespace-pre-line text-sm text-muted-foreground">{detailQ.data.notes}</p>}
          <div className="mt-8">
            <Link to={canonical.to} params={canonical.params as never} className="text-sm text-primary hover:underline">
              {canonical.label} →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
