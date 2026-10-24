import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCurrentRole } from "@/lib/use-role";
import {
  ONBOARDING_BUCKET,
  saveOnboardingProgress,
  useMyOnboardingProgress,
  useOnboardingSlides,
  type OnboardingMedia,
  type OnboardingSlide,
} from "@/lib/onboarding";
import { OnboardingMediaGrid } from "@/components/onboarding/onboarding-media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/_admin/recursos/onboarding")({
  validateSearch: (s: Record<string, unknown>): { edit?: boolean } => ({ edit: s.edit === true || s.edit === "true" ? true : undefined }),
  component: Onboarding,
  head: () => ({
    meta: [
      { title: "Onboarding · IC APP" },
      { name: "description", content: "Benvinguda a Plusmusic i Interesante Compañía, diapositiva a diapositiva." },
      { property: "og:title", content: "Onboarding · IC APP" },
      { property: "og:description", content: "Benvinguda a Plusmusic i Interesante Compañía, diapositiva a diapositiva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Onboarding() {
  const { edit } = Route.useSearch();
  const { isBigC } = useCurrentRole();
  const { data: slides = [], isLoading } = useOnboardingSlides();
  if (isLoading) return <div className="p-10 text-muted-foreground">Cargando…</div>;
  if (edit && isBigC) return <Editor slides={slides} />;
  return <Viewer slides={slides} canEdit={isBigC} />;
}

function Body({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-base leading-relaxed text-foreground/90">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">{p}</p>
      ))}
    </div>
  );
}

function Viewer({ slides, canEdit }: { slides: OnboardingSlide[]; canEdit: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: progress, isFetched } = useMyOnboardingProgress(user?.id);
  const [i, setI] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started || !isFetched || !slides.length) return;
    const last = progress?.completed_at ? 0 : Math.max(0, (progress?.last_position ?? 1) - 1);
    setI(Math.min(last, slides.length - 1));
    setStarted(true);
  }, [isFetched, progress, slides.length, started]);

  useEffect(() => {
    if (!started || !user || !slides.length) return;
    const completed = i === slides.length - 1;
    if (progress?.completed_at && !completed) return;
    void saveOnboardingProgress(user.id, Math.max(i + 1, progress?.last_position ?? 0), completed).then(() =>
      qc.invalidateQueries({ queryKey: ["onboarding-progress"] }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, started]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  const chapters = useMemo(() => {
    const out: { name: string; first: number }[] = [];
    slides.forEach((s, idx) => {
      if (!out.find((c) => c.name === s.chapter)) out.push({ name: s.chapter, first: idx });
    });
    return out;
  }, [slides]);

  if (!slides.length) return <div className="p-10 text-muted-foreground">Todavía no hay diapositivas.</div>;
  const s = slides[i];
  const pct = ((i + 1) / slides.length) * 100;
  const last = i === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-muted">
      <header className="flex shrink-0 items-center gap-4 border-b border-border bg-card px-4 py-2">
        <Link to="/recursos/tutoriales" className="shrink-0 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-rust">
          ← Salir
        </Link>
        <nav className="flex min-w-0 flex-1 justify-center gap-1 overflow-x-auto">
          {chapters.map((c) => (
            <button
              key={c.name}
              onClick={() => setI(c.first)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${s.chapter === c.name ? "bg-primary text-primary-foreground" : "text-aubergine hover:bg-accent"}`}
            >
              {c.name}
            </button>
          ))}
        </nav>
        {canEdit && (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/recursos/onboarding" search={{ edit: true }}>Editar</Link>
          </Button>
        )}
      </header>
      <div className="h-1 w-full shrink-0 bg-border">
        <div className="h-full bg-rust transition-all" style={{ width: `${pct}%` }} />
      </div>

      <SlideStage>
        <SlideCanvas slide={s} index={i} total={slides.length} />
      </SlideStage>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-card px-4 py-3">
        <Button variant="outline" size="lg" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ArrowLeft className="mr-2 h-5 w-5" /> Anterior
        </Button>
        <span className="font-mono text-sm text-muted-foreground">
          {i + 1} / {slides.length} · también con las flechas ← → del teclado
        </span>
        {!last ? (
          <Button size="lg" onClick={() => setI(i + 1)} className={i === 0 ? "animate-pulse" : ""}>
            {i === 0 ? "Empezar" : "Siguiente"} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/recursos/tutoriales">Terminar</Link>
          </Button>
        )}
      </footer>
    </div>
  );
}

/** Escenario 1920x1080 que se escala para ocupar todo el espacio disponible. */
function SlideStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = 24;
      setScale(Math.min((el.clientWidth - pad) / 1920, (el.clientHeight - pad) / 1080));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden rounded-xl bg-background shadow-2xl"
        style={{ width: 1920, height: 1080, marginLeft: -960, marginTop: -540, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function SlideCanvas({ slide: s, index, total }: { slide: OnboardingSlide; index: number; total: number }) {
  const paras = s.body.split(/\n{2,}/).filter(Boolean);
  const isCover = !s.media.length && s.body.length < 120;
  const mediaOnly = !s.body && s.media.length > 0;
  const long = s.body.length > 1100;
  const kicker = (
    <p className="font-mono font-bold uppercase text-rust" style={{ fontSize: 24, letterSpacing: "0.16em" }}>
      {s.chapter} · {index + 1}/{total}
    </p>
  );

  if (isCover)
    return (
      <div className="flex h-full flex-col justify-center bg-primary px-40 text-primary-foreground">
        <p className="font-mono font-bold uppercase opacity-70" style={{ fontSize: 26, letterSpacing: "0.2em" }}>
          {s.chapter}
        </p>
        <h1 className="mt-6 font-display uppercase text-primary-foreground" style={{ fontSize: 140, lineHeight: 0.95 }}>{s.title}</h1>
        {s.body && <p className="mt-10 whitespace-pre-line opacity-90" style={{ fontSize: 44, lineHeight: 1.3 }}>{s.body}</p>}
        {index === 0 && (
          <p className="mt-20 font-mono uppercase opacity-70" style={{ fontSize: 24, letterSpacing: "0.14em" }}>
            Pulsa «Empezar» abajo a la derecha →
          </p>
        )}
      </div>
    );

  if (mediaOnly)
    return (
      <div className="flex h-full flex-col px-24 py-20">
        {kicker}
        <h1 className="mt-4 font-display uppercase text-aubergine" style={{ fontSize: 88, lineHeight: 1 }}>{s.title}</h1>
        <div className="mt-10 min-h-0 flex-1">
          <OnboardingMediaGrid media={s.media} fill />
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col px-24 py-20">
      {kicker}
      <h1 className="mt-4 font-display uppercase text-aubergine" style={{ fontSize: s.title.length > 40 ? 64 : 80, lineHeight: 1.02 }}>
        {s.title}
      </h1>
      <div className={`mt-12 grid min-h-0 flex-1 gap-16 ${s.media.length ? "grid-cols-[1.2fr_1fr]" : ""}`}>
        <div
          className="text-foreground/90"
          style={{ fontSize: long ? 25 : 31, lineHeight: 1.4, columnCount: !s.media.length && s.body.length > 450 ? 2 : 1, columnGap: 80 }}
        >
          {paras.map((p, k) => (
            <p key={k} className="mb-5 whitespace-pre-line" style={{ breakInside: "avoid" }}>{p}</p>
          ))}
        </div>
        {s.media.length > 0 && <OnboardingMediaGrid media={s.media} fill />}
      </div>
    </div>
  );
}

function Editor({ slides }: { slides: OnboardingSlide[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sel, setSel] = useState<string | undefined>(slides[0]?.id);
  const s = slides.find((x) => x.id === sel) ?? slides[0];
  const [draft, setDraft] = useState<OnboardingSlide | undefined>(s);
  useEffect(() => setDraft(s), [s?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => qc.invalidateQueries({ queryKey: ["onboarding-slides"] });

  async function save(patch: Partial<OnboardingSlide>) {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    const { error } = await supabase
      .from("onboarding_slides")
      .update({ title: next.title, body: next.body, chapter: next.chapter, media: next.media })
      .eq("id", next.id);
    if (error) toast.error("No se ha podido guardar");
    else refresh();
  }

  async function move(dir: -1 | 1) {
    const idx = slides.findIndex((x) => x.id === s?.id);
    const other = slides[idx + dir];
    if (!s || !other) return;
    await supabase.from("onboarding_slides").update({ position: other.position }).eq("id", s.id);
    await supabase.from("onboarding_slides").update({ position: s.position }).eq("id", other.id);
    refresh();
  }

  async function add() {
    const max = slides.reduce((m, x) => Math.max(m, x.position), 0);
    const { data, error } = await supabase
      .from("onboarding_slides")
      .insert({ position: max + 1, chapter: s?.chapter ?? "", title: "Nova diapositiva" })
      .select("id")
      .single();
    if (error) return toast.error("No se ha podido crear");
    await refresh();
    setSel(data.id);
  }

  async function remove() {
    if (!s || !confirm(`¿Eliminar la diapositiva «${s.title}»?`)) return;
    await supabase.from("onboarding_slides").delete().eq("id", s.id);
    setSel(undefined);
    refresh();
  }

  async function upload(file: File) {
    if (!draft) return;
    const path = `${draft.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from(ONBOARDING_BUCKET).upload(path, file);
    if (error) return toast.error("No se ha podido subir el archivo");
    const m: OnboardingMedia = { path, kind: file.type.startsWith("video") ? "video" : "image" };
    await save({ media: [...draft.media, m] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="border-b border-border bg-card p-4 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg uppercase text-aubergine">Editar onboarding</p>
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: "/recursos/onboarding", search: {} })} aria-label="Salir">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ol className="mt-4 max-h-[70vh] space-y-1 overflow-y-auto text-sm">
          {slides.map((x, idx) => (
            <li key={x.id}>
              <button
                onClick={() => setSel(x.id)}
                className={`w-full rounded px-2 py-1 text-left ${x.id === s?.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                {idx + 1}. {x.title || "(sin título)"}
              </button>
            </li>
          ))}
        </ol>
        <Button className="mt-4 w-full" variant="outline" onClick={add}>
          <Plus className="mr-1 h-4 w-4" /> Añadir diapositiva
        </Button>
      </aside>
      {draft && (
        <main className="flex-1 space-y-4 p-6 sm:p-10">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => move(-1)}><ArrowUp className="mr-1 h-4 w-4" /> Subir</Button>
            <Button size="sm" variant="outline" onClick={() => move(1)}><ArrowDown className="mr-1 h-4 w-4" /> Bajar</Button>
            <Button size="sm" variant="outline" onClick={remove} className="text-destructive"><Trash2 className="mr-1 h-4 w-4" /> Eliminar</Button>
          </div>
          <label className="block text-sm font-semibold">Capítulo
            <Input value={draft.chapter} onChange={(e) => setDraft({ ...draft, chapter: e.target.value })} onBlur={() => save({})} />
          </label>
          <label className="block text-sm font-semibold">Título
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onBlur={() => save({})} />
          </label>
          <label className="block text-sm font-semibold">Texto (deja una línea en blanco entre párrafos)
            <Textarea rows={16} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} onBlur={() => save({})} />
          </label>
          <div>
            <p className="text-sm font-semibold">GIF, imágenes y vídeos</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {draft.media.map((m, idx) => (
                <div key={idx} className="relative">
                  <OnboardingMediaGrid media={[m]} />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute right-1 top-1 h-6 w-6"
                    onClick={() => save({ media: draft.media.filter((_, j) => j !== idx) })}
                    aria-label="Quitar"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Input
              className="mt-3"
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Los cambios se guardan al salir de cada campo.</p>
        </main>
      )}
    </div>
  );
}
