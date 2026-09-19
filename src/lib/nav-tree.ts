import {
  CalendarDays, Film, Music, Sparkles, LibraryBig, FileSignature, Building2,
  Target, ScrollText, Presentation, Palette, Mail, LineChart, Receipt, Share2,
  KanbanSquare, Handshake, Wallet, Megaphone, Users, Newspaper, MonitorPlay, Clapperboard,
  Video, Newspaper as NewsIcon, BarChart3, ListChecks, Gauge, FolderOpen, ShieldCheck, CalendarRange,
  Briefcase,
} from "lucide-react";

export type NavItem = {
  title: string;
  to: string;
  search?: Record<string, string>;
  icon: typeof Music;
  hint?: string;
  /** Items only BIG C (Dirección) can see. */
  bigCOnly?: boolean;
  /** Extra pathname prefixes that belong to this item (detail routes, aliases). */
  match?: string[];
};

export type NavGroup = {
  label: string;
  icon: typeof Music;
  items: NavItem[];
  /** Pantalla intermedia que presenta las opciones de la sección. */
  landingTo?: string;
  /** Groups only BIG C can see. */
  bigCOnly?: boolean;
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Empresa",
    icon: Wallet,
    landingTo: "/empresa",
    bigCOnly: true,
    items: [
      { title: "KPIs & Objetivos", to: "/empresa/kpis", icon: Gauge },
      { title: "Dashboard económico", to: "/finance", icon: LineChart, match: ["/budget"] },
      { title: "Plan de facturación", to: "/billing", icon: Receipt },
      { title: "Equipo IC", to: "/empresa/equipo", match: ["/people"], icon: Users },
      { title: "Filmografía IC", to: "/empresa/filmografia", icon: Clapperboard, match: ["/ic", "/producciones/filmografia"] },
      { title: "Agentes IA", to: "/empresa/agentes", icon: Sparkles, match: ["/agent-actions"] },
      { title: "Auditoría IA", to: "/empresa/auditoria", icon: ShieldCheck },
    ],
  },
  {
    label: "Clientes",
    icon: LibraryBig,
    landingTo: "/clientes",
    items: [
      { title: "Roster completo", to: "/roster", icon: LibraryBig, match: ["/composers"] },
      { title: "Compositor", to: "/composers", search: { role: "composer" }, icon: Music },
      { title: "Artista", to: "/composers", search: { role: "artist" }, icon: Music },
      { title: "Supervisor", to: "/composers", search: { role: "supervisor" }, icon: Music },
      { title: "Especialista", to: "/composers", search: { role: "specialist" }, icon: Music },
      { title: "Curador", to: "/composers", search: { role: "curator" }, icon: Music },
      { title: "Productor musical", to: "/composers", search: { role: "productor_musical" }, icon: Music },
      { title: "Otros perfiles", to: "/composers", search: { role: "other" }, icon: Music },
    ],
  },
  {
    label: "Partners",
    icon: Handshake,
    landingTo: "/partners",
    items: [
      {
        title: "Productoras",
        to: "/partners/productoras",
        icon: Building2,
        match: ["/partners", "/production-companies", "/platforms", "/directors", "/providers", "/marketing/target-accounts"],
      },
      { title: "Plataformas", to: "/partners/plataformas", icon: MonitorPlay },
      { title: "Medios", to: "/partners/medios", icon: Newspaper },
      { title: "Instituciones", to: "/partners/instituciones", icon: LibraryBig },
      { title: "Actividad internacional", to: "/empresa/actividad-internacional", icon: Handshake },
      { title: "Subvenciones", to: "/oportunidades/subvenciones", icon: Wallet },
    ],
  },
  {
    label: "Oportunidades de ventas",
    icon: Target,
    landingTo: "/oportunidades",
    items: [
      { title: "Producciones en desarrollo", to: "/oportunidades/producciones", icon: Film, match: ["/opportunities"] },
      { title: "Productoras a contactar", to: "/oportunidades/partners", icon: Building2 },
      { title: "Pitches en curso", to: "/oportunidades/pitches", icon: Sparkles },
      {
        title: "Fichajes que queremos",
        to: "/oportunidades/fichajes",
        icon: Music,
        match: ["/oportunidades/roster", "/oportunidades/prospects-fichaje", "/oportunidades/prospect"],
      },
    ],
  },
  {
    label: "Producciones",
    icon: Film,
    landingTo: "/producciones",
    items: [
      { title: "Activas", to: "/producciones/activas", icon: Film, match: ["/productions"] },
      { title: "Seguimiento", to: "/producciones/seguimiento", icon: KanbanSquare },
      { title: "Gantt", to: "/producciones/gantt", icon: CalendarRange },
      { title: "Finalizadas", to: "/producciones/finalizadas", icon: FolderOpen },
      { title: "Producciones españolas", to: "/producciones/espanolas", icon: Clapperboard, match: ["/peliculas-es"] },
    ],
  },
  {
    label: "Paperwork",
    icon: FileSignature,
    landingTo: "/paperwork",
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
    landingTo: "/comunicacion",
    items: [
      { title: "Identidad corporativa", to: "/marketing/brand", icon: Palette },
      { title: "Templates publicaciones", to: "/comunicacion/publicaciones", icon: Mail },
      { title: "Blog / Publicaciones", to: "/comunicacion/blog", icon: NewsIcon },
      { title: "EPK", to: "/comunicacion/epk", icon: Presentation },
      { title: "Reels", to: "/comunicacion/reels", icon: Video },
      { title: "Clipping", to: "/comunicacion/clipping", icon: Newspaper },
      { title: "Festivales", to: "/oportunidades/festivales", icon: Sparkles },
      { title: "Premios", to: "/oportunidades/premios", icon: Target },
      { title: "Prensa", to: "/oportunidades/prensa", icon: Newspaper },
      { title: "Documentos de venta", to: "/comunicacion/documentos-venta", icon: Presentation, match: ["/marketing/ventas"] },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    landingTo: "/marketing",
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
  {
    label: "Recursos",
    icon: FolderOpen,
    landingTo: "/recursos",
    items: [
      { title: "Templates", to: "/templates", icon: ScrollText },
      { title: "Calendario general", to: "/calendar", search: { view: "global" }, icon: CalendarDays },
      { title: "Tutoriales", to: "/recursos/tutoriales", icon: Presentation },
      { title: "BI", to: "/recursos/bi", icon: BarChart3 },
      { title: "Agentes IA", to: "/empresa/agentes", icon: Sparkles, bigCOnly: true },
      { title: "Auditoría", to: "/empresa/auditoria", icon: ShieldCheck, bigCOnly: true },
    ],
  },
  {
    label: "Departamentos",
    icon: Briefcase,
    landingTo: "/departamentos",
    items: [
      { title: "Financiero", to: "/finance", icon: LineChart, bigCOnly: true },
      { title: "Facturas", to: "/billing", icon: Receipt, bigCOnly: true },
      { title: "Personal", to: "/empresa/equipo", icon: Users, bigCOnly: true },
      { title: "CRM", to: "/partners", icon: Handshake, bigCOnly: true },
      { title: "Marketing", to: "/marketing/campanas", icon: Megaphone },
    ],
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
