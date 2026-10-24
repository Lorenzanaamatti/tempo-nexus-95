import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  const separator = !s.body && s.media.length > 0;
  const pct = ((i + 1) / slides.length) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="h-1.5 w-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="border-b border-border bg-card p-4 lg:w-60 lg:border-b-0 lg:border-r">
          <Link to="/recursos/tutoriales" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-rust">
            ← Tutoriales
          </Link>
          <nav className="mt-4 flex gap-2 overflow-x-auto lg:flex-col">
            {chapters.map((c) => {
              const active = s.chapter === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setI(c.first)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-semibold ${active ? "bg-primary text-primary-foreground" : "text-aubergine hover:bg-accent"}`}
                >
                  {c.name}
                </button>
              );
            })}
          </nav>
          {canEdit && (
            <Button asChild variant="outline" size="sm" className="mt-6">
              <Link to="/recursos/onboarding" search={{ edit: true }}>Editar</Link>
            </Button>
          )}
        </aside>
        <main className="flex flex-1 flex-col px-6 py-8 sm:px-12">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-rust">
            {s.chapter} · {i + 1}/{slides.length}
          </p>
          <h1 className={`mt-2 font-display uppercase leading-tight text-aubergine ${separator ? "text-5xl" : "text-3xl sm:text-4xl"}`}>
            {s.title}
          </h1>
          <div className={`mt-6 grid flex-1 content-start gap-8 ${s.body && s.media.length ? "lg:grid-cols-2" : ""}`}>
            {s.body && <Body text={s.body} />}
            <OnboardingMediaGrid media={s.media} />
          </div>
          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            {i < slides.length - 1 ? (
              <Button onClick={() => setI(i + 1)}>
                Siguiente <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button asChild>
                <Link to="/recursos/tutoriales">Terminar</Link>
              </Button>
            )}
          </div>
        </main>
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
