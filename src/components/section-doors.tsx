import { Link } from "@tanstack/react-router";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type Door = {
  title: string;
  /** Línea breve que describe el trabajo que se hace al entrar. */
  description?: string;
  to?: string;
  search?: Record<string, string>;
  onClick?: () => void;
  selected?: boolean;
  icon?: LucideIcon;
};

const BASE =
  "group flex h-auto min-h-28 w-full whitespace-normal rounded-md border px-5 py-5 text-left shadow-none transition-all duration-200 focus-visible:ring-2 sm:min-h-32 sm:px-6";

function doorClass(selected?: boolean) {
  return selected
    ? `${BASE} border-primary bg-primary text-primary-foreground hover:bg-primary/95`
    : `${BASE} border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-rust hover:bg-card hover:shadow-md`;
}

/** Parrilla de "puertas": botones grandes, limpios, sin datos añadidos. */
export function SectionDoors({
  doors,
  columns = 3,
  wide = false,
  children,
}: {
  doors: Door[];
  columns?: 2 | 3;
  wide?: boolean;
  children?: ReactNode;
}) {
  const cols = columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`mx-auto grid w-full grid-cols-1 gap-3 ${wide ? "max-w-none" : "max-w-4xl"} ${cols}`}>
      {doors.map((door) => {
        const Icon = door.icon;
        const content = (
          <span className="flex h-full w-full flex-col">
            <span className="flex items-start justify-between gap-4">
              {Icon ? (
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${door.selected ? "bg-primary-foreground/15" : "bg-accent text-accent-foreground"}`}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              ) : <span />}
              <ArrowUpRight className={`size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${door.selected ? "text-primary-foreground/70" : "text-rust"}`} aria-hidden="true" />
            </span>
            <span className={`mt-auto pt-4 font-display text-2xl font-extrabold uppercase leading-[0.95] sm:text-3xl ${
              door.selected ? "text-primary-foreground" : "text-aubergine"
            }`}>
              {door.title}
            </span>
            {door.description ? (
              <span className={`mt-2 block max-w-[38ch] text-base font-normal leading-snug ${door.selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {door.description}
              </span>
            ) : null}
          </span>
        );
        if (door.to) {
          return (
            <Button key={door.title} asChild variant="outline" className={doorClass(door.selected)}>
              <Link to={door.to} search={door.search as never}>{content}</Link>
            </Button>
          );
        }
        return (
          <Button key={door.title} type="button" variant="outline" onClick={door.onClick} className={doorClass(door.selected)}>
            {content}
          </Button>
        );
      })}
      {children}
    </div>
  );
}
