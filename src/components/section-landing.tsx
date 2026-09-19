import { SectionDoors, type Door } from "@/components/section-doors";

export function SectionLanding({
  eyebrow = "Sección",
  title,
  description,
  doors,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  doors: Door[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 max-w-3xl border-b border-border pb-7 sm:mb-10">
        <p className="font-mono text-xs font-bold uppercase text-rust">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl uppercase text-aubergine sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <SectionDoors doors={doors} wide />
    </div>
  );
}