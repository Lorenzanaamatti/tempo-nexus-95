import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export type Door = {
  title: string;
  /** Línea breve que describe el trabajo que se hace al entrar. */
  description?: string;
  to?: string;
  search?: Record<string, string>;
  onClick?: () => void;
  selected?: boolean;
};

const BASE =
  "flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-card px-6 py-6 text-center transition hover:border-[color:var(--rust)] hover:shadow-sm";

function doorClass(selected?: boolean) {
  return selected
    ? `${BASE} border-[color:var(--aubergine)] bg-[color:var(--aubergine)] text-primary-foreground hover:border-[color:var(--aubergine)]`
    : `${BASE} text-[color:var(--rust)]`;
}

/** Parrilla de "puertas": botones grandes, limpios, sin datos añadidos. */
export function SectionDoors({
  doors,
  columns = 3,
  children,
}: {
  doors: Door[];
  columns?: 2 | 3;
  children?: ReactNode;
}) {
  const cols = columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 ${cols}`}>
      {doors.map((door) => {
        const content = (
          <>
            <span className="font-display text-xl font-extrabold uppercase leading-tight tracking-tight">
              {door.title}
            </span>
            {door.description && (
              <span className={`text-xs ${door.selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {door.description}
              </span>
            )}
          </>
        );
        if (door.to) {
          return (
            <Link
              key={door.title}
              to={door.to}
              search={door.search as never}
              className={doorClass(door.selected)}
            >
              {content}
            </Link>
          );
        }
        return (
          <button key={door.title} type="button" onClick={door.onClick} className={doorClass(door.selected)}>
            {content}
          </button>
        );
      })}
      {children}
    </div>
  );
}
