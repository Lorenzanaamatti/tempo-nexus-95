import {
  CalendarDays, Film, Music, Mic2, Headphones, Sparkles, ListMusic, LibraryBig,
  Inbox, FileSignature, Building2, Clapperboard, Tv, Target, ScrollText, Crosshair,
  Presentation, Palette, Mail, LineChart, Receipt, Share2, KanbanSquare, Handshake,
  Scale, Wallet, Megaphone, Users, Briefcase,
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
    label: "Clientes",
    icon: LibraryBig,
    items: [
      { title: "Roster completo", to: "/roster", icon: LibraryBig, hint: "Directorio agrupado por categoría" },
      { title: "Compositores", to: "/composers", search: { role: "composer" }, icon: Music },
      { title: "Artistas", to: "/composers", search: { role: "artist" }, icon: Mic2 },
      { title: "Supervisores musicales", to: "/composers", search: { role: "supervisor" }, icon: Headphones },
      { title: "Especialistas", to: "/composers", search: { role: "specialist" }, icon: Sparkles },
      { title: "Curadores musicales", to: "/composers", search: { role: "curator" }, icon: ListMusic },
      { title: "Interesante Compañía", to: "/ic", icon: Building2, hint: "Filmografía propia" },
    ],
  },
  {
    label: "Partners",
    icon: Handshake,
    items: [
      { title: "Productoras", to: "/production-companies", icon: Building2 },
      { title: "Plataformas", to: "/platforms", icon: Tv },
      { title: "Directores", to: "/directors", icon: Clapperboard },
      { title: "Otros partners", to: "/providers", icon: Briefcase },
    ],
  },
  {
    label: "Oportunidades",
    icon: Target,
    items: [
      { title: "Oportunidades", to: "/opportunities", icon: Target },
      { title: "Cuentas objetivo", to: "/marketing/target-accounts", icon: Crosshair },
      { title: "Candidaturas", to: "/candidacies", icon: Inbox },
    ],
  },
  {
    label: "Empresa",
    icon: Wallet,
    bigCOnly: true,
    items: [
      { title: "Producciones en curso", to: "/productions", icon: Film },
      { title: "Dashboard económico", to: "/finance", icon: LineChart, match: ["/budget"] },
      { title: "Pipeline de facturación", to: "/billing", icon: Receipt },
    ],
  },
  {
    label: "Legal",
    icon: Scale,
    items: [
      { title: "Templates contrato", to: "/legal/templates-contrato", icon: ScrollText },
      { title: "Templates deal memo", to: "/legal/templates-deal-memo", icon: FileSignature },
      { title: "Templates presupuesto", to: "/legal/templates-presupuesto", icon: Receipt },
      { title: "Deal memos", to: "/deal-memos", icon: KanbanSquare },
      { title: "Contratos firmados", to: "/legal/contratos-firmados", icon: FileSignature, match: ["/contracts"] },
      { title: "Personal · Equipo IC", to: "/people", icon: Users },
      { title: "Personal IA · Equipo agentes IC", to: "/agent-actions", icon: Sparkles },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    items: [
      { title: "Identidad corporativa", to: "/marketing/brand", icon: Palette },
      { title: "Ventas", to: "/marketing/ventas", icon: Presentation },
      { title: "Comunicación", to: "/marketing/comunicacion", icon: Share2 },
      { title: "Templates", to: "/marketing/templates", icon: Mail },
    ],
  },
  {
    label: "Calendarios",
    icon: CalendarDays,
    items: [{ title: "Calendarios", to: "/calendar", icon: CalendarDays }],
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
  // Don't let /composers (no role) light up role-scoped rows twice.
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
