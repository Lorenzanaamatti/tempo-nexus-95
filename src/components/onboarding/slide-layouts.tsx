import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Plus } from "lucide-react";
import type { OnboardingSlide } from "@/lib/onboarding";
import { OnboardingMediaGrid } from "./onboarding-media";

/**
 * Diseños del onboarding. El texto de cada diapositiva usa un marcado sencillo:
 *   ## Título de bloque        → tarjeta / columna / paso / persona («Nombre — rol»)
 *   - punto                    → viñeta (numerada en el diseño «list»)
 *   > frase                    → destacado
 *   @ nombres                  → etiqueta de responsables
 *   **negrita**                → negrita
 *   start: 5 / sep: +          → número inicial de la lista / separador del diagrama
 */
export const SLIDE_LAYOUTS = [
  { key: "cover", label: "Portada" },
  { key: "section", label: "Inicio de capítulo" },
  { key: "statement", label: "Bloque de color + texto" },
  { key: "list", label: "Lista numerada" },
  { key: "cards", label: "Tarjetas" },
  { key: "columns", label: "Dos columnas" },
  { key: "people", label: "Personas" },
  { key: "steps", label: "Pasos con flechas" },
  { key: "diagram", label: "Diagrama con flechas" },
  { key: "media", label: "Texto + imagen" },
  { key: "collage", label: "Collage de GIF" },
] as const;

type Line = { kind: "p" | "li" | "callout" | "chip"; text: string };
type Block = { heading?: string; lines: Line[] };
type Parsed = { blocks: Block[]; start: number; sep?: string };

export function parseBody(body: string): Parsed {
  const blocks: Block[] = [{ lines: [] }];
  let start = 1;
  let sep: string | undefined;
  for (const raw of body.split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    if (/^start:\s*\d+$/i.test(l)) start = Number(l.split(":")[1]);
    else if (/^sep:/i.test(l)) sep = l.slice(4).trim();
    else if (l.startsWith("## ")) blocks.push({ heading: l.slice(3).trim(), lines: [] });
    else {
      const cur = blocks[blocks.length - 1];
      if (l.startsWith("- ")) cur.lines.push({ kind: "li", text: l.slice(2) });
      else if (l.startsWith("> ")) cur.lines.push({ kind: "callout", text: l.slice(2) });
      else if (l.startsWith("@ ")) cur.lines.push({ kind: "chip", text: l.slice(2) });
      else cur.lines.push({ kind: "p", text: l });
    }
  }
  return { blocks: blocks.filter((b, i) => i > 0 || b.lines.length), start, sep };
}

function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-aubergine">{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** Reduce el tamaño de letra hasta que el contenido cabe en su caja. */
function AutoFit({ children, base = 30, min = 18, className = "" }: { children: ReactNode; base?: number; min?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(base);
  useLayoutEffect(() => {
    setSize(base);
  }, [children, base]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.scrollHeight > el.clientHeight + 2 && size > min) setSize((s) => s - 1);
  }, [size, min, children]);
  return (
    <div ref={ref} className={`min-h-0 overflow-hidden ${className}`} style={{ fontSize: size, lineHeight: 1.4 }}>
      {children}
    </div>
  );
}

function Lines({ lines, numbered, start = 1 }: { lines: Line[]; numbered?: boolean; start?: number }) {
  let n = start - 1;
  return (
    <div className="space-y-[0.6em]">
      {lines.map((l, i) => {
        if (l.kind === "li") {
          n += 1;
          return (
            <div key={i} className="flex gap-[0.7em]">
              {numbered ? (
                <span className="w-[1.6em] shrink-0 font-mono font-bold text-rust">{String(n).padStart(2, "0")}</span>
              ) : (
                <span className="mt-[0.55em] h-[0.4em] w-[0.4em] shrink-0 rounded-full bg-rust" />
              )}
              <p className="text-foreground/90"><Rich text={l.text} /></p>
            </div>
          );
        }
        if (l.kind === "callout")
          return (
            <p key={i} className="border-l-[6px] border-rust bg-rust-soft px-[0.8em] py-[0.5em] font-medium text-aubergine">
              <Rich text={l.text} />
            </p>
          );
        if (l.kind === "chip")
          return (
            <p key={i} className="inline-block rounded-full bg-aubergine px-[0.8em] py-[0.2em] font-mono text-[0.75em] uppercase tracking-wider text-primary-foreground">
              {l.text}
            </p>
          );
        return <p key={i} className="text-foreground/90"><Rich text={l.text} /></p>;
      })}
    </div>
  );
}

function Header({ s, index, total }: { s: OnboardingSlide; index: number; total: number }) {
  return (
    <div className="shrink-0">
      <p className="font-mono font-bold uppercase text-rust" style={{ fontSize: 22, letterSpacing: "0.16em" }}>
        {s.chapter} · {index + 1}/{total}
      </p>
      <h1 className="mt-3 font-display font-bold text-aubergine" style={{ fontSize: s.title.length > 42 ? 60 : 76, lineHeight: 1.02, letterSpacing: "-0.02em" }}>
        {s.title}
      </h1>
    </div>
  );
}

function Frame({ s, index, total, children }: { s: OnboardingSlide; index: number; total: number; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-background px-28 pb-20 pt-20">
      <Header s={s} index={index} total={total} />
      <div className="mt-12 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function SlideLayout({ slide: s, index, total }: { slide: OnboardingSlide; index: number; total: number }) {
  const { blocks, start, sep } = parseBody(s.body);
  const loose = blocks.filter((b) => !b.heading).flatMap((b) => b.lines);
  const titled = blocks.filter((b) => b.heading);
  const media = s.media.filter((m) => !m.design);

  switch (s.layout) {
    case "cover":
      return (
        <div className="relative flex h-full flex-col justify-center bg-aubergine px-40 text-primary-foreground">
          <p className="font-mono font-bold uppercase opacity-70" style={{ fontSize: 26, letterSpacing: "0.2em" }}>Benvinguda</p>
          <h1 className="mt-6 font-display font-bold text-primary-foreground" style={{ fontSize: 170, lineHeight: 0.92, letterSpacing: "-0.03em" }}>{s.title}</h1>
          <p className="mt-10 opacity-90" style={{ fontSize: 48 }}>{s.body}</p>
          <div className="absolute bottom-0 left-0 h-6 w-full bg-rust" />
          {index === 0 && (
            <p className="absolute bottom-20 right-24 font-mono uppercase opacity-80" style={{ fontSize: 24, letterSpacing: "0.14em" }}>
              Pulsa «Empezar» →
            </p>
          )}
        </div>
      );

    case "section":
      return (
        <div className="grid h-full grid-cols-[1.1fr_1fr] items-center gap-20 bg-aubergine px-28 text-primary-foreground">
          <div>
            <p className="font-mono font-bold uppercase text-rust-soft" style={{ fontSize: 24, letterSpacing: "0.2em" }}>
              {s.chapter} · {index + 1}/{total}
            </p>
            <h1 className="mt-6 font-display font-bold text-primary-foreground" style={{ fontSize: s.title.length > 25 ? 100 : 140, lineHeight: 0.95, letterSpacing: "-0.03em" }}>
              {s.title}
            </h1>
            {s.body && <p className="mt-8 opacity-80" style={{ fontSize: 40 }}>{s.body}</p>}
          </div>
          {media.length > 0 ? (
            <div className="h-[620px] overflow-hidden rounded-3xl"><OnboardingMediaGrid media={media} fill stretch /></div>
          ) : (
            <div className="h-full border-l-[24px] border-rust" />
          )}
        </div>
      );

    case "statement":
      return (
        <div className="grid h-full grid-cols-[640px_1fr]">
          <div className="flex flex-col justify-between bg-aubergine p-20 text-primary-foreground">
            <p className="font-mono font-bold uppercase text-rust-soft" style={{ fontSize: 22, letterSpacing: "0.16em" }}>
              {s.chapter} · {index + 1}/{total}
            </p>
            <div>
              <p className="font-mono uppercase opacity-70" style={{ fontSize: 26, letterSpacing: "0.14em" }}>Plusmusic</p>
              <h1 className="mt-4 font-display font-bold text-primary-foreground" style={{ fontSize: s.title.length > 14 ? 76 : 110, lineHeight: 0.98 }}>{s.title}</h1>
            </div>
            {media[0] ? <div className="h-56"><OnboardingMediaGrid media={[media[0]]} fill stretch /></div> : <div className="h-3 w-40 bg-rust" />}
          </div>
          <div className="flex min-h-0 flex-col justify-center px-24 py-20">
            <AutoFit base={42} className="flex flex-col justify-center"><Lines lines={loose} /></AutoFit>
          </div>
        </div>
      );

    case "list":
      return (
        <Frame s={s} index={index} total={total}>
          <AutoFit base={42} className="flex-1"><Lines lines={loose} numbered start={start} /></AutoFit>
        </Frame>
      );

    case "cards": {
      const cols = titled.length === 5 ? "grid-cols-3" : titled.length === 3 ? "grid-cols-3" : "grid-cols-2";
      return (
        <Frame s={s} index={index} total={total}>
          <div className={`grid min-h-0 flex-1 auto-rows-fr gap-8 ${cols}`}>
            {titled.map((b, i) => (
              <div key={i} className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-10 shadow-sm">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono font-bold text-rust" style={{ fontSize: 22 }}>{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="font-display font-bold text-aubergine" style={{ fontSize: 38, lineHeight: 1.05 }}>{b.heading}</h2>
                </div>
                <AutoFit base={32} min={16} className="mt-5 flex-1"><Lines lines={b.lines} /></AutoFit>
              </div>
            ))}
          </div>
        </Frame>
      );
    }

    case "people":
      return (
        <Frame s={s} index={index} total={total}>
          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-8">
            {titled.map((b, i) => {
              const [name, role] = (b.heading ?? "").split(" — ");
              return (
                <div key={i} className="flex min-h-0 gap-8 rounded-3xl border border-border bg-card p-10">
                  <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full bg-aubergine font-display font-bold text-primary-foreground" style={{ fontSize: 52 }}>
                    {name.trim()[0]}
                  </div>
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <h2 className="font-display font-bold text-aubergine" style={{ fontSize: 42, lineHeight: 1 }}>{name}</h2>
                    {role && <p className="mt-2 font-mono font-bold uppercase text-rust" style={{ fontSize: 20, letterSpacing: "0.1em" }}>{role}</p>}
                    <AutoFit base={30} min={16} className="mt-4 flex-1"><Lines lines={b.lines} /></AutoFit>
                  </div>
                </div>
              );
            })}
          </div>
        </Frame>
      );

    case "columns":
      return (
        <Frame s={s} index={index} total={total}>
          {loose.length > 0 && <div className="mb-8" style={{ fontSize: 28 }}><Lines lines={loose} /></div>}
          <div className={`grid min-h-0 flex-1 gap-16 ${media.length ? "grid-cols-[1fr_1fr_420px]" : "grid-cols-2"}`}>
            {titled.map((b, i) => (
              <div key={i} className="flex min-h-0 flex-col">
                <h2 className="border-b-4 border-rust pb-4 font-display font-bold text-aubergine" style={{ fontSize: 40, lineHeight: 1.05 }}>{b.heading}</h2>
                <AutoFit base={34} min={17} className="mt-6 flex-1"><Lines lines={b.lines} /></AutoFit>
              </div>
            ))}
            {media.length > 0 && <div className="self-center"><div className="h-[420px]"><OnboardingMediaGrid media={media} fill stretch /></div></div>}
          </div>
        </Frame>
      );

    case "steps":
      if (titled.length > 4) {
        return (
          <Frame s={s} index={index} total={total}>
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-8">
              {titled.map((b, i) => (
                <div key={i} className="relative flex min-h-0 min-w-0 flex-col rounded-3xl bg-card p-9 shadow-sm ring-1 ring-border">
                  <div className="flex items-center gap-5">
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-aubergine font-display font-bold text-primary-foreground" style={{ fontSize: 30 }}>{i + 1}</span>
                    <h2 className="font-display font-bold text-aubergine" style={{ fontSize: 36, lineHeight: 1.05 }}>{b.heading}</h2>
                    {i < titled.length - 1 && <ArrowRight className="ml-auto h-10 w-10 shrink-0 text-rust" strokeWidth={2.5} />}
                  </div>
                  <AutoFit base={32} min={16} className="mt-5 flex-1"><Lines lines={b.lines} /></AutoFit>
                </div>
              ))}
            </div>
          </Frame>
        );
      }
      return (
        <Frame s={s} index={index} total={total}>
          <div className="flex min-h-0 flex-1 items-stretch gap-4">
            {titled.map((b, i) => (
              <Fragment key={i}>
                {i > 0 && <ArrowRight className="h-14 w-14 shrink-0 self-center text-rust" strokeWidth={2.5} />}
                <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-card p-9 shadow-sm ring-1 ring-border">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-aubergine font-display font-bold text-primary-foreground" style={{ fontSize: 30 }}>{i + 1}</span>
                  <h2 className="mt-6 font-display font-bold text-aubergine" style={{ fontSize: 34, lineHeight: 1.05 }}>{b.heading}</h2>
                  <AutoFit base={32} min={16} className="mt-4 flex-1"><Lines lines={b.lines} /></AutoFit>
                </div>
              </Fragment>
            ))}
          </div>
        </Frame>
      );

    case "diagram": {
      const nodes = loose.filter((l) => l.kind === "li");
      const rest = loose.filter((l) => l.kind !== "li");
      const plus = sep === "+";
      const result = !plus ? rest.find((l) => l.kind === "callout") : undefined;
      const notes = rest.filter((l) => l !== result);
      return (
        <Frame s={s} index={index} total={total}>
          <div className="flex flex-1 flex-col justify-center gap-14">
            <div className="flex items-center justify-center gap-6">
              {nodes.map((n, i) => (
                <Fragment key={i}>
                  {i > 0 && (plus ? <Plus className="h-14 w-14 shrink-0 text-rust" strokeWidth={3} /> : <ArrowRight className="h-16 w-16 shrink-0 text-rust" strokeWidth={2.5} />)}
                  <div
                    className={`grid shrink-0 place-items-center rounded-full text-center font-display font-bold ${!plus && i === 1 ? "h-80 w-80 bg-aubergine text-primary-foreground" : "h-60 w-60 border-4 border-aubergine bg-card text-aubergine"}`}
                    style={{ fontSize: !plus && i === 1 ? 50 : plus ? 28 : 34, lineHeight: 1.05, padding: 20 }}
                  >
                    {n.text}
                  </div>
                </Fragment>
              ))}
              {result && (
                <>
                  <ArrowRight className="h-16 w-16 shrink-0 text-rust" strokeWidth={2.5} />
                  <div className="grid h-80 w-96 shrink-0 place-items-center rounded-[48px] bg-rust p-8 text-center font-display font-bold text-primary-foreground" style={{ fontSize: 40, lineHeight: 1.1 }}>
                    {result.text}
                  </div>
                </>
              )}
            </div>
            {notes.length > 0 && <div className="mx-auto max-w-[1300px]" style={{ fontSize: 36, lineHeight: 1.4 }}><Lines lines={notes} /></div>}
          </div>
        </Frame>
      );
    }

    case "media":
      return (
        <Frame s={s} index={index} total={total}>
          <div className={`grid min-h-0 flex-1 gap-16 ${s.body ? "grid-cols-[1fr_1.15fr]" : "grid-cols-1"}`}>
            {s.body && (
              <AutoFit base={38} className="flex flex-col justify-center">
                {loose.length > 0 && <Lines lines={loose} />}
                {titled.map((b, i) => (
                  <div key={i} className="mt-[0.9em] first:mt-0">
                    <h2 className="font-display font-bold text-aubergine" style={{ fontSize: "1.3em", lineHeight: 1.1 }}>{b.heading}</h2>
                    <div className="mt-[0.3em]"><Lines lines={b.lines} /></div>
                  </div>
                ))}
              </AutoFit>
            )}
            <div className="min-h-0">
              {media.length === 1 ? (
                <OnboardingMediaGrid media={media} fill stretch />
              ) : (
                <div className="grid h-full grid-cols-3 gap-5">
                  {media.map((m, i) => (
                    <div key={i} className="min-h-0 overflow-hidden rounded-2xl"><OnboardingMediaGrid media={[m]} cover /></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Frame>
      );

    case "collage":
      return (
        <div className="relative h-full w-full bg-background">
          {[...media].sort((a, b) => (a.box?.z ?? 0) - (b.box?.z ?? 0)).map((m, k) =>
            m.box ? (
              <div key={k} className="absolute" style={{ left: `${m.box.x * 100}%`, top: `${m.box.y * 100}%`, width: `${m.box.w * 100}%`, height: `${m.box.h * 100}%` }}>
                <OnboardingMediaGrid media={[m]} fill stretch />
              </div>
            ) : null,
          )}
        </div>
      );

    default:
      return (
        <Frame s={s} index={index} total={total}>
          <div className={`grid min-h-0 flex-1 gap-16 ${media.length ? "grid-cols-[1.2fr_1fr]" : ""}`}>
            <AutoFit base={30}>
              <Lines lines={loose} />
              {titled.map((b, i) => (
                <div key={i} className="mt-6">
                  <h2 className="font-display font-bold text-aubergine" style={{ fontSize: "1.3em" }}>{b.heading}</h2>
                  <Lines lines={b.lines} />
                </div>
              ))}
            </AutoFit>
            {media.length > 0 && <OnboardingMediaGrid media={media} fill />}
          </div>
        </Frame>
      );
  }
}
