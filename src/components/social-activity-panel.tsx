import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { SOCIAL_CHANNEL_LABEL, SOCIAL_POST_STATUS_LABEL, type SocialChannel, type SocialPostStatus } from "@/lib/social-constants";

export function SocialActivityPanel({ composerId, productionId }: { composerId?: string; productionId?: string }) {
  const key = composerId ? ["social-by-composer", composerId] : ["social-by-production", productionId];
  const { data } = useQuery({
    queryKey: key,
    enabled: !!(composerId || productionId),
    queryFn: async () => {
      let q = supabase.from("social_posts").select("id, channel, status, title, copy_es, scheduled_for, published_at").order("scheduled_for", { ascending: false, nullsFirst: false });
      if (composerId) q = q.eq("composer_id", composerId);
      if (productionId) q = q.eq("production_id", productionId);
      const { data } = await q.limit(20);
      return data ?? [];
    },
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Últimos 20 posts vinculados.</p>
        <Link to="/marketing/social" search={{ ...(composerId ? { composer: composerId } : {}), ...(productionId ? { production: productionId } : {}) } as any} className="text-xs text-primary hover:underline">Abrir en redes sociales →</Link>
      </div>
      {!data?.length ? (
        <p className="text-sm text-muted-foreground">Aún no hay actividad.</p>
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {data.map((p: any) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <Badge variant="outline" className="rounded-sm">{SOCIAL_CHANNEL_LABEL[p.channel as SocialChannel]}</Badge>
              <span className="flex-1 truncate">{p.title || p.copy_es?.slice(0, 80) || "(sin título)"}</span>
              {p.scheduled_for && <span className="font-mono text-[10px] text-muted-foreground">{new Date(p.scheduled_for).toLocaleDateString("es-ES")}</span>}
              <Badge className="rounded-sm" variant={p.status === "publicado" ? "default" : "secondary"}>{SOCIAL_POST_STATUS_LABEL[p.status as SocialPostStatus]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}