import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentRole } from "@/lib/use-role";
import { BrandLogo } from "@/components/brand-logo";
import {
  LibraryBig, Music, Mic2, Headphones, Sparkles, ListMusic, Building2,
  Handshake, Crosshair, Tv, Clapperboard, Briefcase, Inbox,
  Target, Wallet, LineChart, Film, KanbanSquare, Receipt,
  Scale, ScrollText, FileSignature, User, Users,
  Megaphone, Presentation, Newspaper, Palette, Trophy, Mail, FolderOpen, Share2,
  CalendarDays, UserCog,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

type Tile = {
  title: string;
  to: string;
  search?: Record<string, string>;
  icon: typeof Music;
  hint?: string;
};
type Group = { label: string; icon: typeof Music; items: Tile[] };

const GROUPS: Group[] = [
  {
    label: "Roster",
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
    items: [
      { title: "Producciones en curso", to: "/productions", icon: Film },
      { title: "Dashboard económico", to: "/finance", icon: LineChart },
      { title: "Pipeline de facturación", to: "/billing", icon: Receipt },
    ],
  },
  {
    label: "Legal",
    icon: Scale,
    items: [
      { title: "Contratos", to: "/contracts", icon: ScrollText },
      { title: "Deal memos", to: "/deal-memos", icon: KanbanSquare },
      { title: "Plantillas DM", to: "/deal-memos/plantillas", icon: FileSignature },
      { title: "Equipo IC", to: "/people", icon: Users },
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
    items: [
      { title: "Calendarios", to: "/calendar", icon: CalendarDays },
    ],
  },
];

function Index() {
  const { role, status, isStaff, isBigC, loading } = useCurrentRole();
  useEffect(() => {
    if (loading) return;
    if (status === "pending" || status === "rejected") {
      window.location.replace("/pending");
      return;
    }
    if (!isStaff) window.location.replace("/me");
  }, [role, status, isStaff, loading]);

  if (loading || !isStaff || status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-muted-foreground">
        Abriendo el archivo…
      </div>
    );
  }

  const visibleGroups = GROUPS.filter((g) => isBigC || g.label !== "Empresa").map((g) =>
    g.label === "Legal" && isBigC
      ? { ...g, items: [...g.items, { title: "Usuarios y permisos", to: "/users", icon: UserCog }] as typeof g.items }
      : g,
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-10 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Bienvenida</p>
        <BrandLogo variant="auto" className="mt-1 h-20 w-auto" />
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Elige un área para navegar por el archivo. Tienes el árbol completo siempre disponible en la barra lateral.
        </p>
      </header>

      <div className="space-y-10">
        {visibleGroups.map((group) => (
          <section key={group.label}>
            <div className="mb-3 flex items-end justify-between border-b border-border pb-2">
              <h2 className="flex items-center gap-2 font-display text-2xl">
                <group.icon className="h-4 w-4 text-muted-foreground" />
                {group.label}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Link
                  key={`${group.label}-${item.title}`}
                  to={item.to}
                  search={item.search as never}
                  className="group flex items-start gap-3 rounded-sm border border-border p-4 transition hover:border-primary/60 hover:bg-muted/40"
                >
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                  <div className="min-w-0">
                    <p className="font-display text-base leading-tight">{item.title}</p>
                    {item.hint && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.hint}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}