import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, FileText, ExternalLink, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { signMarketingAsset } from "@/lib/marketing-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/portal/prensa")({
  component: PortalPrensa,
});

function PortalPrensa() {
  const { composerId } = usePortalComposer();

  const kitsQ = useQuery({
    queryKey: ["portal-press-kits", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("press_kits")
        .select("id, title, language, version, storage_path, external_url, public_link, notes")
        .eq("composer_id", composerId)
        .eq("visible_to_composer", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const clippingsQ = useQuery({
    queryKey: ["portal-clippings", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("press_clippings")
        .select("id, outlet, headline, author, published_date, language, url, screenshot_path, featured")
        .eq("composer_id", composerId)
        .eq("visible_to_composer", true)
        .order("featured", { ascending: false })
        .order("published_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function openSigned(path: string | null) {
    if (!path) return;
    const url = await signMarketingAsset(path);
    if (url) window.open(url, "_blank");
  }

  return (
    <div className="space-y-10">
      <header>
        <h2 className="font-display text-3xl">Prensa</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tus press kits y apariciones en medios, curados por IC.</p>
      </header>

      <section>
        <h3 className="mb-3 font-display text-xl flex items-center gap-2"><FileText className="h-4 w-4" /> Press kits / EPK</h3>
        {kitsQ.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p>
          : !kitsQ.data?.length ? <p className="text-sm text-muted-foreground">Aún no hay press kits publicados para ti.</p>
          : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {kitsQ.data.map((k: any) => (
                <li key={k.id} className="rounded-sm border border-border bg-white/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display text-lg">{k.title}</h4>
                    {k.version && <Badge variant="outline" className="rounded-sm text-[10px]">v{k.version}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{k.language}</p>
                  {k.notes && <p className="mt-2 text-xs">{k.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {k.storage_path && <Button size="sm" variant="outline" onClick={() => openSigned(k.storage_path)}><Download className="mr-1 h-3 w-3" /> Descargar</Button>}
                    {k.external_url && <a href={k.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Enlace</a>}
                    {k.public_link && <a href={k.public_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Enlace público</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl flex items-center gap-2"><Newspaper className="h-4 w-4" /> Clipping</h3>
        {clippingsQ.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p>
          : !clippingsQ.data?.length ? <p className="text-sm text-muted-foreground">Aún no hay apariciones en prensa publicadas.</p>
          : (
            <ul className="space-y-3">
              {clippingsQ.data.map((c: any) => (
                <li key={c.id} className="rounded-sm border border-border bg-white/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="smallcaps text-xs text-muted-foreground">{c.outlet}</span>
                        {c.featured && <Badge variant="outline" className="rounded-sm text-[10px]">Destacada</Badge>}
                      </div>
                      <p className="mt-1 font-display text-lg">{c.headline}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {c.author ? `Por ${c.author} · ` : ""}{c.published_date ?? ""}{c.language ? ` · ${c.language}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Abrir</a>}
                      {c.screenshot_path && <button onClick={() => openSigned(c.screenshot_path)} className="text-xs text-primary hover:underline">Ver captura</button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}