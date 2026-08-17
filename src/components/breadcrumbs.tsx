import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { findNavLocation } from "@/lib/nav-tree";

type CrumbCtx = { detail: string | null; setDetail: (v: string | null) => void };
const Ctx = createContext<CrumbCtx>({ detail: null, setDetail: () => {} });

export function PageCrumbProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<string | null>(null);
  const value = useMemo(() => ({ detail, setDetail }), [detail]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Renders nothing: detail pages use it to publish the real record name
 * as the last breadcrumb level.
 */
export function PageCrumb({ label }: { label: string | null | undefined }) {
  const { setDetail } = useContext(Ctx);
  useEffect(() => {
    setDetail(label ?? null);
    return () => setDetail(null);
  }, [label, setDetail]);
  return null;
}

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.search as { role?: string } });
  const { detail } = useContext(Ctx);

  const location = findNavLocation(pathname, search);
  if (pathname === "/" || !location) return null;

  const { group, item } = location;
  const isDetail = pathname !== item.to && Boolean(detail);
  // En la página índice, el título de la propia página ya aparece como H1:
  // no repetimos el nombre en la barra superior.
  if (!isDetail) {
    return (
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem className="hidden sm:block">
            <BreadcrumbLink asChild>
              <Link to="/" className="smallcaps">Inicio</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:block" />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="smallcaps truncate">{group.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="hidden sm:block">
          <BreadcrumbLink asChild>
            <Link to="/" className="smallcaps">Inicio</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden sm:block" />
        <BreadcrumbItem className="hidden md:block">
          <span className="smallcaps text-muted-foreground">{group.label}</span>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem className="min-w-0">
          {isDetail ? (
            <BreadcrumbLink asChild>
              <Link to={item.to} search={item.search as never} className="smallcaps">
                {item.title}
              </Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="smallcaps truncate">{item.title}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {isDetail && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate font-display">{detail}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
