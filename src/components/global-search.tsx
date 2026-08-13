import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Music, Users, Film, Crosshair, Clapperboard, Search } from "lucide-react";

/**
 * Buscador global (⌘K / Ctrl+K). Único punto de búsqueda transversal:
 * roster, equipo, cuentas objetivo, producciones y CRM de películas.
 */
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

type Hit = { id: string; label: string; sub?: string | null };

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate();
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(term.trim()), 220);
    return () => clearTimeout(t);
  }, [term]);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", q],
    enabled: q.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const like = `%${q}%`;
      const db = supabase as any;
      const [composers, people, accounts, productions, films] = await Promise.all([
        db.from("composers").select("id, full_name, artistic_name, roster_role").or(`full_name.ilike.${like},artistic_name.ilike.${like}`).limit(6),
        db.from("people").select("id, full_name, role").ilike("full_name", like).limit(5),
        db.from("target_accounts").select("id, name, status").ilike("name", like).limit(5),
        db.from("productions").select("id, title, year").ilike("title", like).limit(5),
        db.from("spanish_films").select("id, title, year").ilike("title", like).limit(6),
      ]);
      return {
        composers: (composers.data ?? []).map((r: any) => ({ id: r.id, label: r.artistic_name || r.full_name, sub: r.roster_role })) as Hit[],
        people: (people.data ?? []).map((r: any) => ({ id: r.id, label: r.full_name, sub: r.role })) as Hit[],
        accounts: (accounts.data ?? []).map((r: any) => ({ id: r.id, label: r.name, sub: r.status })) as Hit[],
        productions: (productions.data ?? []).map((r: any) => ({ id: r.id, label: r.title, sub: r.year ? String(r.year) : null })) as Hit[],
        films: (films.data ?? []).map((r: any) => ({ id: r.id, label: r.title, sub: r.year ? String(r.year) : null })) as Hit[],
      };
    },
  });

  function go(to: string, params?: Record<string, string>, search?: Record<string, string>) {
    onOpenChange(false);
    setTerm("");
    nav({ to: to as never, params: params as never, search: search as never });
  }

  const groups: { key: string; label: string; icon: typeof Music; hits: Hit[]; onPick: (h: Hit) => void }[] = [
    { key: "composers", label: "Roster", icon: Music, hits: data?.composers ?? [], onPick: (h) => go("/composers/$composerId", { composerId: h.id }) },
    { key: "people", label: "Equipo IC", icon: Users, hits: data?.people ?? [], onPick: (h) => go("/people/$personId", { personId: h.id }) },
    { key: "accounts", label: "Cuentas objetivo", icon: Crosshair, hits: data?.accounts ?? [], onPick: (h) => go("/marketing/target-accounts/$accountId", { accountId: h.id }) },
    { key: "productions", label: "Producciones", icon: Film, hits: data?.productions ?? [], onPick: (h) => go("/productions/$productionId", { productionId: h.id }) },
    { key: "films", label: "CRM Películas ES", icon: Clapperboard, hits: data?.films ?? [], onPick: () => go("/peliculas-es") },
  ];

  const empty = groups.every((g) => g.hits.length === 0);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={term}
        onValueChange={setTerm}
        placeholder="Buscar personas, cuentas, películas, proyectos…"
      />
      <CommandList>
        {q.length < 2 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            Escribe al menos dos letras para buscar en todo el archivo.
          </div>
        ) : isFetching && empty ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Buscando…</div>
        ) : empty ? (
          <CommandEmpty>Sin resultados para “{q}”.</CommandEmpty>
        ) : null}
        {groups.map((g) =>
          g.hits.length ? (
            <CommandGroup key={g.key} heading={g.label}>
              {g.hits.map((h) => (
                <CommandItem key={`${g.key}-${h.id}`} value={`${g.key}-${h.id}-${h.label}`} onSelect={() => g.onPick(h)}>
                  <g.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{h.label}</span>
                  {h.sub && <span className="ml-2 shrink-0 text-xs text-muted-foreground">{h.sub}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null,
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-4 hidden items-center gap-2 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground sm:flex"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Buscar</span>
      <kbd className="rounded-sm border border-border px-1 text-[10px]">⌘K</kbd>
    </button>
  );
}
