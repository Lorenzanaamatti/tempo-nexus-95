import {
  CalendarDays, Film, Music, Sparkles, LibraryBig, FileSignature, Building2,
  Target, ScrollText, Presentation, Palette, Mail, LineChart, Receipt, Share2,
  KanbanSquare, Handshake, Wallet, Megaphone, Users, Newspaper, MonitorPlay, Clapperboard,
  Video, Newspaper as NewsIcon, BarChart3, ListChecks, Gauge, FolderOpen,
} from "lucide-react";

export type NavItem = {
  title: string;
  to: string;
  search?: Record<string, string>;
  icon: typeof Music;
  hint?: string;
  /** Extra pathname prefixes that belong to this item (detail routes, aliases). */
  match?: string[];
};

export type NavGroup = {
  label: string;
  icon: typeof Music;
  items: NavItem[];
  /** Groups only BIG C can see. */
  bigCOnly?: boolean;
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Empresa",
    icon: Wallet,
    bigCOnly: true,
    items: [
      { title: "KPIs & Objetivos", to: "/empresa/kpis", icon: Gauge },
      { title: "Actividad internacional", to: "/empresa/actividad-internacional", icon: Handshake },
      { title: "Dashboard económico", to: "/finance", icon: LineChart, match: ["/budget"] },
      { title: "Plan de facturación", to: "/billing", icon: Receipt },
      { title: "Equipo IC", to: "/empresa/equipo", match: ["/people"], icon: Users },
      { title: "Filmografía IC", to: "/empresa/filmografia", icon: Clapperboard, match: ["/ic", "/producciones/filmografia"] },
      { title: "Agentes IA", to: "/empresa/agentes", icon: Sparkles, match: ["/agent-actions"] },
    ],
  },
  {
    label: "Clientes",
    icon: LibraryBig,
    items: [
      { title: "Roster completo", to: "/roster", icon: LibraryBig, match: ["/composers"] },
      { title: "Compositor", to: "/composers", search: { role: "composer" }, icon: Music },
      { title: "Artista", to: "/composers", search: { role: "artist" }, icon: Music },
      { title: "Supervisor", to: "/composers", search: { role: "supervisor" }, icon: Music },
      { title: "Especialista", to: "/composers", search: { role: "specialist" }, icon: Music },
      { title: "Curador", to: "/composers", search: { role: "curator" }, icon: Music },
    ],
  },
  {
    label: "Partners",
    icon: Handshake,
    items: [
      {
        title: "Vista completa",
        to: "/partners",
        icon: Handshake,
        match: ["/production-companies", "/platforms", "/directors", "/providers", "/marketing/target-accounts"],
      },
      { title: "Productoras", to: "/partners/productoras", icon: Building2 },
      { title: "Plataformas", to: "/partners/plataformas", icon: MonitorPlay },
      { title: "Medios", to: "/partners/medios", icon: Newspaper },
      { title: "Instituciones", to: "/partners/instituciones", icon: LibraryBig },
    ],
  },
  {
    label: "Oportunidades de ventas",
    icon: Target,
    items: [
      { title: "A Producciones", to: "/oportunidades/producciones", icon: Film, match: ["/opportunities"] },
      { title: "A Partners", to: "/oportunidades/partners", icon: Building2 },
      { title: "A Roster", to: "/oportunidades/roster", icon: Music },
      { title: "Subvenciones", to: "/oportunidades/subvenciones", icon: Wallet },
      { title: "Festivales", to: "/oportunidades/festivales", icon: Sparkles },
      { title: "Premios", to: "/oportunidades/premios", icon: Target },
      { title: "Prensa", to: "/oportunidades/prensa", icon: Sparkles },
      { title: "Prospects de fichaje", to: "/oportunidades/prospects-fichaje", icon: Target },
    ],
  },
  {
    label: "Producciones",
    icon: Film,
    items: [
      { title: "Activas", to: "/producciones/activas", icon: Film, match: ["/productions"] },
      { title: "Finalizadas", to: "/producciones/finalizadas", icon: FolderOpen },
      { title: "Producciones españolas", to: "/producciones/espanolas", icon: Clapperboard, match: ["/peliculas-es"] },
    ],
  },
  {
    label: "Paperwork",
    icon: FileSignature,
    items: [
      { title: "Presupuestos", to: "/paperwork/presupuestos", icon: Receipt },
      { title: "Deal Memos", to: "/paperwork/deal-memos", icon: KanbanSquare, match: ["/deal-memos"] },
      { title: "Contratos", to: "/contracts", icon: FileSignature, match: ["/legal/contratos-firmados"] },
      { title: "Adendas", to: "/paperwork/adendas", icon: ScrollText },
      { title: "Contrato Laboral", to: "/paperwork/contrato-laboral", icon: ScrollText },
      { title: "Contrato Proveedor", to: "/paperwork/contrato-proveedor", icon: ScrollText },
      { title: "Otros", to: "/paperwork/otros", icon: FolderOpen },
    ],
  },
  {
    label: "Templates documentos",
    icon: ScrollText,
    items: [
      { title: "Templates", to: "/templates", icon: ScrollText, match: ["/legal/templates-contrato", "/legal/templates-deal-memo", "/legal/templates-presupuesto"] },
    ],
  },
  {
    label: "Comunicación",
    icon: Share2,
    items: [
      { title: "Identidad corporativa", to: "/marketing/brand", icon: Palette },
      { title: "Templates publicaciones", to: "/comunicacion/publicaciones", icon: Mail },
      { title: "Blog / Publicaciones", to: "/comunicacion/blog", icon: NewsIcon },
      { title: "EPK", to: "/comunicacion/epk", icon: Presentation },
      { title: "Reels", to: "/comunicacion/reels", icon: Video },
      { title: "Clipping", to: "/comunicacion/clipping", icon: Newspaper },
      { title: "Documentos de venta", to: "/comunicacion/documentos-venta", icon: Presentation, match: ["/marketing/ventas"] },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    items: [
      { title: "Campañas", to: "/marketing/campanas", icon: Megaphone },
      { title: "Métricas", to: "/marketing/metricas", icon: BarChart3 },
      { title: "Obligaciones", to: "/marketing/obligaciones", icon: ListChecks },
    ],
  },
  {
    label: "Calendario",
    icon: CalendarDays,
    items: [{ title: "General", to: "/calendar", search: { view: "global" }, icon: CalendarDays }],
  },
];

/** Prefixes an item owns, including the route itself and its detail pages. */
function prefixesOf(item: NavItem): string[] {
  return [item.to, ...(item.match ?? [])];
}

export function isItemActive(item: NavItem, pathname: string, search?: { role?: string }): boolean {
  const matches = prefixesOf(item).some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!matches) return false;
  if (item.search?.role) {
    const current = search?.role ?? "composer";
    return current === item.search.role;
  }
  return true;
}

/** Finds the group + item that own the current pathname. */
export function findNavLocation(pathname: string, search?: { role?: string }) {
  let best: { group: NavGroup; item: NavItem; score: number } | null = null;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (!isItemActive(item, pathname, search)) continue;
      const score = Math.max(...prefixesOf(item).map((p) => (pathname.startsWith(p) ? p.length : 0)));
      if (!best || score > best.score) best = { group, item, score };
    }
  }
  return best ? { group: best.group, item: best.item } : null;
}
