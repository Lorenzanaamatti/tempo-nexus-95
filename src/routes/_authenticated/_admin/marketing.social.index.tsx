import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ExternalLink, Image as ImageIcon, Video as VideoIcon, FileText } from "lucide-react";
import {
  SOCIAL_CHANNELS,
  SOCIAL_CHANNEL_LABEL,
  SOCIAL_FORMATS,
  SOCIAL_FORMAT_LABEL,
  SOCIAL_POST_STATUSES,
  SOCIAL_POST_STATUS_LABEL,
  SOCIAL_ASSET_KINDS,
  type SocialChannel,
  type SocialFormat,
  type SocialPostStatus,
  type SocialAssetKind,
} from "@/lib/social-constants";
import { uploadMarketingAsset, signMarketingAsset, deleteMarketingAsset } from "@/lib/marketing-upload";

export const Route = createFileRoute("/_authenticated/_admin/marketing/social/")({
  component: SocialIndex,
});

type Post = {
  id: string;
  channel: SocialChannel;
  format: SocialFormat;
  status: SocialPostStatus;
  title: string | null;
  copy_es: string | null;
  copy_en: string | null;
  copy_ca: string | null;
  hashtags: string[];
  cta_label: string | null;
  cta_url: string | null;
  brief: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  published_url: string | null;
  composer_id: string | null;
  production_id: string | null;
  campaign_id: string | null;
  parent_post_id: string | null;
  notes: string | null;
};

function SocialIndex() {
  const qc = useQueryClient();
  const search = useRouterState({ select: (s) => s.location.search as { channel?: SocialChannel; composer?: string; production?: string; tab?: string } });
  const channel: SocialChannel | "all" = (search?.channel as SocialChannel | undefined) ?? "all";
  const composerFilter = search?.composer || "all";
  const productionFilter = search?.production || "all";
  const tab = search?.tab || "posts";
  const [editing, setEditing] = useState<Post | null>(null);

  const { data: composers } = useQuery({
    queryKey: ["composers-min"],
    queryFn: async () => {
      const { data } = await supabase.from("composers").select("id, full_name, artistic_name").order("full_name");
      return data ?? [];
    },
  });
  const { data: productions } = useQuery({
    queryKey: ["productions-min"],
    queryFn: async () => {
      const { data } = await supabase.from("productions").select("id, title").order("title");
      return data ?? [];
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["social-posts", channel, composerFilter, productionFilter],
    queryFn: async () => {
      let q = supabase.from("social_posts").select("*").order("scheduled_for", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
      if (channel !== "all") q = q.eq("channel", channel as SocialChannel);
      if (composerFilter !== "all") q = q.eq("composer_id", composerFilter);
      if (productionFilter !== "all") q = q.eq("production_id", productionFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  async function createPost() {
    const { data, error } = await supabase
      .from("social_posts")
      .insert({
        channel: channel === "all" ? "instagram" : (channel as SocialChannel),
        format: "feed",
        status: "borrador",
        composer_id: composerFilter !== "all" ? composerFilter : null,
        production_id: productionFilter !== "all" ? productionFilter : null,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["social-posts"] });
    setEditing(data as Post);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Marketing y ventas</p>
        <h1 className="mt-1 font-display text-5xl">REDES SOCIALES IC</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Posts planificables por canal, por representado y por producción. Fotos, vídeos, copies multi-idioma, hashtags, CTAs, calendario, campañas, plantillas y métricas.
        </p>
      </header>

      {/* Tabs */}
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-2 text-sm">
        {[
          ["posts", "Posts"],
          ["calendario", "Calendario"],
          ["campañas", "Campañas"],
          ["plantillas", "Plantillas de copy"],
          ["hashtags", "Hashtags"],
        ].map(([k, l]) => (
          <Link key={k} to="/marketing/social" search={{ ...search, tab: k }} className={`rounded-sm px-3 py-1 ${tab === k ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{l}</Link>
        ))}
      </nav>

      {tab === "posts" && (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <ChannelFilter value={channel} />
            <Select value={composerFilter} onValueChange={(v) => navTo({ ...search, composer: v })}>
              <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Representado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los representados</SelectItem>
                {(composers ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.artistic_name || c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productionFilter} onValueChange={(v) => navTo({ ...search, production: v })}>
              <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Producción" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las producciones</SelectItem>
                {(productions ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={createPost} className="ml-auto"><Plus className="mr-1 h-4 w-4" /> Nuevo post</Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : !posts?.length ? (
            <p className="text-sm text-muted-foreground">No hay posts con estos filtros.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <button key={p.id} onClick={() => setEditing(p)} className="group rounded-sm border border-border p-4 text-left transition hover:border-primary">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge variant="outline" className="rounded-sm">{SOCIAL_CHANNEL_LABEL[p.channel]}</Badge>
                    <Badge className="rounded-sm" variant={p.status === "publicado" ? "default" : "secondary"}>{SOCIAL_POST_STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <div className="font-display text-lg leading-tight">{p.title || p.copy_es?.slice(0, 60) || "(sin título)"}</div>
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{p.copy_es ?? ""}</p>
                  <div className="mt-3 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span>{SOCIAL_FORMAT_LABEL[p.format]}</span>
                    {p.scheduled_for && <span>· {new Date(p.scheduled_for).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "calendario" && <SocialCalendar posts={posts ?? []} />}
      {tab === "campañas" && <CampaignsPanel />}
      {tab === "plantillas" && <TemplatesPanel />}
      {tab === "hashtags" && <HashtagsPanel />}

      <PostEditor post={editing} onClose={() => setEditing(null)} composers={composers ?? []} productions={productions ?? []} />
    </div>
  );
}

function navTo(search: Record<string, any>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) if (v && v !== "all") params.set(k, String(v));
  window.history.pushState({}, "", `/marketing/social${params.toString() ? "?" + params : ""}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function ChannelFilter({ value }: { value: SocialChannel | "all" }) {
  const search = useRouterState({ select: (s) => s.location.search });
  return (
    <div className="flex flex-wrap gap-1">
      <Link to="/marketing/social" search={{ ...(search as object), channel: undefined }} className={`rounded-sm border px-3 py-1.5 text-xs ${value === "all" ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>Todos</Link>
      {SOCIAL_CHANNELS.map((c) => (
        <Link key={c} to="/marketing/social" search={{ ...(search as object), channel: c }} className={`rounded-sm border px-3 py-1.5 text-xs ${value === c ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{SOCIAL_CHANNEL_LABEL[c]}</Link>
      ))}
    </div>
  );
}

// =============== Post editor sheet ===============
function PostEditor({ post, onClose, composers, productions }: { post: Post | null; onClose: () => void; composers: any[]; productions: any[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Post | null>(post);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(post), [post?.id]);

  async function save() {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase.from("social_posts").update({
      channel: form.channel,
      format: form.format,
      status: form.status,
      title: form.title,
      copy_es: form.copy_es,
      copy_en: form.copy_en,
      copy_ca: form.copy_ca,
      hashtags: form.hashtags,
      cta_label: form.cta_label,
      cta_url: form.cta_url,
      brief: form.brief,
      scheduled_for: form.scheduled_for,
      published_at: form.published_at,
      published_url: form.published_url,
      composer_id: form.composer_id,
      production_id: form.production_id,
      notes: form.notes,
    }).eq("id", form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Post guardado");
    qc.invalidateQueries({ queryKey: ["social-posts"] });
  }

  async function removePost() {
    if (!form || !confirm("¿Eliminar este post?")) return;
    const { error } = await supabase.from("social_posts").delete().eq("id", form.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["social-posts"] });
    onClose();
  }

  return (
    <Sheet open={!!form} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        {form && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">Editar post</SheetTitle>
              <SheetDescription>{SOCIAL_CHANNEL_LABEL[form.channel]} · {SOCIAL_FORMAT_LABEL[form.format]}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Canal">
                  <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as SocialChannel })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOCIAL_CHANNELS.map((c) => <SelectItem key={c} value={c}>{SOCIAL_CHANNEL_LABEL[c]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Formato">
                  <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v as SocialFormat })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOCIAL_FORMATS.map((f) => <SelectItem key={f} value={f}>{SOCIAL_FORMAT_LABEL[f]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Estado">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SocialPostStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOCIAL_POST_STATUSES.map((s) => <SelectItem key={s} value={s}>{SOCIAL_POST_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Programado para">
                  <Input type="datetime-local" value={toLocal(form.scheduled_for)} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                </Field>
                <Field label="Representado">
                  <Select value={form.composer_id ?? "none"} onValueChange={(v) => setForm({ ...form, composer_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {composers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.artistic_name || c.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Producción">
                  <Select value={form.production_id ?? "none"} onValueChange={(v) => setForm({ ...form, production_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {productions.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Título interno">
                <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sólo para uso interno" />
              </Field>

              <div className="grid gap-3">
                <Field label="Copy ES"><Textarea rows={4} value={form.copy_es ?? ""} onChange={(e) => setForm({ ...form, copy_es: e.target.value })} /></Field>
                <Field label="Copy EN"><Textarea rows={3} value={form.copy_en ?? ""} onChange={(e) => setForm({ ...form, copy_en: e.target.value })} /></Field>
                <Field label="Copy CA"><Textarea rows={3} value={form.copy_ca ?? ""} onChange={(e) => setForm({ ...form, copy_ca: e.target.value })} /></Field>
              </div>

              <Field label="Hashtags (separados por espacio o coma)">
                <Input
                  value={(form.hashtags ?? []).join(" ")}
                  onChange={(e) => setForm({ ...form, hashtags: e.target.value.split(/[\s,]+/).filter(Boolean) })}
                  placeholder="#bso #cine #música"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA texto"><Input value={form.cta_label ?? ""} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></Field>
                <Field label="CTA URL"><Input value={form.cta_url ?? ""} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} /></Field>
              </div>

              <Field label="Brief interno (qué se necesita grabar/diseñar)">
                <Textarea rows={2} value={form.brief ?? ""} onChange={(e) => setForm({ ...form, brief: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Publicado el"><Input type="datetime-local" value={toLocal(form.published_at)} onChange={(e) => setForm({ ...form, published_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
                <Field label="URL publicada"><Input value={form.published_url ?? ""} onChange={(e) => setForm({ ...form, published_url: e.target.value })} /></Field>
              </div>

              <Field label="Notas"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>

              <PostAssetsEditor postId={form.id} />

              <PostMetricsEditor postId={form.id} />

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <Button variant="ghost" onClick={removePost}><Trash2 className="mr-1 h-4 w-4" /> Eliminar</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Cerrar</Button>
                  <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function toLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

// =============== Assets per post ===============
type Asset = { id: string; post_id: string; kind: SocialAssetKind; storage_path: string | null; external_url: string | null; caption: string | null; alt_text: string | null; position: number };

function PostAssetsEditor({ postId }: { postId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("social_post_assets").select("*").eq("post_id", postId).order("position");
    const list = (data ?? []) as Asset[];
    setAssets(list);
    const map: Record<string, string | null> = {};
    await Promise.all(list.map(async (a) => {
      map[a.id] = a.storage_path ? await signMarketingAsset(a.storage_path) : a.external_url;
    }));
    setUrls(map);
  }
  useEffect(() => { void load(); }, [postId]);

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const path = await uploadMarketingAsset(`social/${postId}`, file);
      const kind: SocialAssetKind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("image/") ? "image" : "documento";
      const { error } = await supabase.from("social_post_assets").insert({ post_id: postId, kind, storage_path: path, position: assets.length });
      if (error) throw error;
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  async function addExternal() {
    const url = window.prompt("URL del recurso (imagen, vídeo o link)"); if (!url) return;
    const { error } = await supabase.from("social_post_assets").insert({ post_id: postId, kind: "image", external_url: url, position: assets.length });
    if (error) return toast.error(error.message);
    await load();
  }

  async function removeAsset(a: Asset) {
    if (!confirm("¿Eliminar este recurso?")) return;
    await supabase.from("social_post_assets").delete().eq("id", a.id);
    if (a.storage_path) await deleteMarketingAsset(a.storage_path);
    await load();
  }

  return (
    <div className="rounded-sm border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Adjuntos ({assets.length})</Label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addExternal}>Enlace externo</Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-sm border border-border bg-background px-3 text-xs hover:bg-muted">
            <Upload className="h-3 w-3" /> {uploading ? "Subiendo…" : "Subir"}
            <input type="file" hidden accept="image/*,video/*,audio/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); e.target.value = ""; }} />
          </label>
        </div>
      </div>
      {assets.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin adjuntos. Sube fotos, vídeos o audio.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {assets.map((a) => (
            <div key={a.id} className="group relative aspect-square overflow-hidden rounded-sm border border-border bg-muted">
              {a.kind === "image" && urls[a.id] && <img src={urls[a.id]!} alt="" className="h-full w-full object-cover" />}
              {a.kind === "video" && urls[a.id] && <video src={urls[a.id]!} className="h-full w-full object-cover" muted />}
              {a.kind !== "image" && a.kind !== "video" && (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  {a.kind === "audio" ? <VideoIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                </div>
              )}
              <button onClick={() => removeAsset(a)} className="absolute right-1 top-1 hidden rounded-full bg-background/90 p-1 group-hover:block">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============== Metrics ===============
function PostMetricsEditor({ postId }: { postId: string }) {
  const [m, setM] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("social_post_metrics").select("*").eq("post_id", postId).maybeSingle().then(({ data }) => setM(data ?? { post_id: postId }));
  }, [postId]);

  async function save() {
    if (!m) return;
    setSaving(true);
    const payload = { ...m, post_id: postId };
    const { error } = await supabase.from("social_post_metrics").upsert(payload, { onConflict: "post_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Métricas guardadas");
  }

  if (!m) return null;
  const fields: [string, string][] = [
    ["impressions", "Impresiones"], ["reach", "Alcance"], ["likes", "Likes"],
    ["comments", "Comentarios"], ["shares", "Compartidos"], ["saves", "Guardados"],
    ["clicks", "Clics"], ["video_views", "Reproducciones"],
  ];
  return (
    <div className="rounded-sm border border-border p-3">
      <Label className="text-xs text-muted-foreground">Métricas tras publicar</Label>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {fields.map(([k, l]) => (
          <div key={k}>
            <Label className="text-[10px] text-muted-foreground">{l}</Label>
            <Input type="number" value={m[k] ?? ""} onChange={(e) => setM({ ...m, [k]: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-end"><Button size="sm" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar métricas"}</Button></div>
    </div>
  );
}

// =============== Calendar (simple month list) ===============
function SocialCalendar({ posts }: { posts: Post[] }) {
  const scheduled = posts.filter((p) => p.scheduled_for).sort((a, b) => (a.scheduled_for! < b.scheduled_for! ? -1 : 1));
  const groups = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of scheduled) {
      const d = new Date(p.scheduled_for!);
      const k = d.toLocaleDateString("es-ES", { year: "numeric", month: "long" });
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return Array.from(m.entries());
  }, [scheduled]);

  if (!scheduled.length) return <p className="text-sm text-muted-foreground">No hay posts programados.</p>;
  return (
    <div className="space-y-6">
      {groups.map(([month, items]) => (
        <div key={month}>
          <h3 className="smallcaps mb-2 text-muted-foreground">{month}</h3>
          <ul className="divide-y divide-border rounded-sm border border-border">
            {items.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="w-24 font-mono text-xs text-muted-foreground">{new Date(p.scheduled_for!).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <Badge variant="outline" className="rounded-sm">{SOCIAL_CHANNEL_LABEL[p.channel]}</Badge>
                <span className="font-display">{p.title || p.copy_es?.slice(0, 60) || "(sin título)"}</span>
                <Badge className="ml-auto rounded-sm" variant={p.status === "publicado" ? "default" : "secondary"}>{SOCIAL_POST_STATUS_LABEL[p.status]}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// =============== Campaigns ===============
function CampaignsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["social-campaigns"], queryFn: async () => (await supabase.from("social_campaigns").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [name, setName] = useState("");
  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("social_campaigns").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    setName(""); qc.invalidateQueries({ queryKey: ["social-campaigns"] });
  }
  async function update(id: string, patch: any) {
    await supabase.from("social_campaigns").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["social-campaigns"] });
  }
  async function del(id: string) {
    if (!confirm("¿Eliminar campaña?")) return;
    await supabase.from("social_campaigns").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["social-campaigns"] });
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva campaña…" /><Button onClick={add}><Plus className="h-4 w-4" /></Button></div>
      <div className="divide-y divide-border rounded-sm border border-border">
        {(data ?? []).map((c: any) => (
          <div key={c.id} className="grid gap-2 px-4 py-3 sm:grid-cols-6">
            <Input className="sm:col-span-2" defaultValue={c.name} onBlur={(e) => update(c.id, { name: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Objetivo" defaultValue={c.objective ?? ""} onBlur={(e) => update(c.id, { objective: e.target.value || null })} />
            <Input type="date" defaultValue={c.start_date ?? ""} onBlur={(e) => update(c.id, { start_date: e.target.value || null })} />
            <div className="flex gap-2">
              <Input type="date" defaultValue={c.end_date ?? ""} onBlur={(e) => update(c.id, { end_date: e.target.value || null })} />
              <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============== Templates ===============
function TemplatesPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["social-templates"], queryFn: async () => (await supabase.from("social_copy_templates").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [editing, setEditing] = useState<any>(null);
  async function add() {
    const { data, error } = await supabase.from("social_copy_templates").insert({ title: "Nueva plantilla" }).select("*").single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["social-templates"] }); setEditing(data);
  }
  async function save() {
    const { error } = await supabase.from("social_copy_templates").update({
      title: editing.title, channel: editing.channel, occasion: editing.occasion, body_md: editing.body_md, variables: editing.variables, language: editing.language, notes: editing.notes,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["social-templates"] }); toast.success("Plantilla guardada");
  }
  async function del(id: string) {
    if (!confirm("¿Eliminar plantilla?")) return;
    await supabase.from("social_copy_templates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["social-templates"] }); setEditing(null);
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div>
        <Button onClick={add} className="mb-3"><Plus className="mr-1 h-4 w-4" /> Nueva plantilla</Button>
        <div className="divide-y divide-border rounded-sm border border-border">
          {(data ?? []).map((t: any) => (
            <button key={t.id} onClick={() => setEditing(t)} className={`block w-full px-4 py-2 text-left text-sm hover:bg-muted ${editing?.id === t.id ? "bg-muted" : ""}`}>
              <div className="font-display">{t.title}</div>
              <div className="text-xs text-muted-foreground">{t.channel ? SOCIAL_CHANNEL_LABEL[t.channel as SocialChannel] : "—"} · {t.occasion ?? ""}</div>
            </button>
          ))}
        </div>
      </div>
      {editing && (
        <div className="space-y-3 rounded-sm border border-border p-4">
          <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Título" />
          <div className="grid grid-cols-3 gap-2">
            <Select value={editing.channel ?? "none"} onValueChange={(v) => setEditing({ ...editing, channel: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent><SelectItem value="none">—</SelectItem>{SOCIAL_CHANNELS.map((c) => <SelectItem key={c} value={c}>{SOCIAL_CHANNEL_LABEL[c]}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={editing.occasion ?? ""} onChange={(e) => setEditing({ ...editing, occasion: e.target.value })} placeholder="Ocasión (estreno, premio…)" />
            <Input value={editing.language ?? "es"} onChange={(e) => setEditing({ ...editing, language: e.target.value })} placeholder="es / en / ca" />
          </div>
          <Textarea rows={8} value={editing.body_md ?? ""} onChange={(e) => setEditing({ ...editing, body_md: e.target.value })} placeholder="Cuerpo. Usa {compositor}, {producción}, {director}, {plataforma}, {fecha}…" />
          <Input value={(editing.variables ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, variables: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} placeholder="Variables (compositor, producción…)" />
          <Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Notas" />
          <div className="flex justify-between"><Button variant="ghost" onClick={() => del(editing.id)}><Trash2 className="mr-1 h-4 w-4" /> Eliminar</Button><Button onClick={save}>Guardar</Button></div>
        </div>
      )}
    </div>
  );
}

// =============== Hashtag sets ===============
function HashtagsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["social-hashtags"], queryFn: async () => (await supabase.from("social_hashtag_sets").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [name, setName] = useState("");
  async function add() {
    if (!name.trim()) return;
    await supabase.from("social_hashtag_sets").insert({ name: name.trim() });
    setName(""); qc.invalidateQueries({ queryKey: ["social-hashtags"] });
  }
  async function update(id: string, patch: any) {
    await supabase.from("social_hashtag_sets").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["social-hashtags"] });
  }
  async function del(id: string) {
    if (!confirm("¿Eliminar conjunto?")) return;
    await supabase.from("social_hashtag_sets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["social-hashtags"] });
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo conjunto…" /><Button onClick={add}><Plus className="h-4 w-4" /></Button></div>
      <div className="divide-y divide-border rounded-sm border border-border">
        {(data ?? []).map((s: any) => (
          <div key={s.id} className="grid gap-2 px-4 py-3 sm:grid-cols-6">
            <Input className="sm:col-span-1" defaultValue={s.name} onBlur={(e) => update(s.id, { name: e.target.value })} />
            <Select value={s.channel ?? "none"} onValueChange={(v) => update(s.id, { channel: v === "none" ? null : v })}>
              <SelectTrigger className="sm:col-span-1"><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent><SelectItem value="none">—</SelectItem>{SOCIAL_CHANNELS.map((c) => <SelectItem key={c} value={c}>{SOCIAL_CHANNEL_LABEL[c]}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="sm:col-span-3" defaultValue={(s.hashtags ?? []).join(" ")} onBlur={(e) => update(s.id, { hashtags: e.target.value.split(/[\s,]+/).filter(Boolean) })} placeholder="#bso #cine #musica" />
            <Button size="icon" variant="ghost" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}