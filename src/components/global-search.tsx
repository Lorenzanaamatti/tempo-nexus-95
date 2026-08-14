import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Search, Music, Users, Building2, Film, Target, FileSignature, Crosshair } from "lucide-react";

type Hit = { id: string; label: string; sub?: string | null; group: string; go: () => void };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resultsQ = useQuery({
    queryKey: ["global-search", term],
    enabled: open && term.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<Hit[]> => {
      const like = `%${term}%`;
      const [composers, people, companies, films, accounts, opportunities, dealMemos] = await Promise.all([
        supabase.from("composers").select("id, full_name, roster_role").ilike("full_name", like).limit(6),
        supabase.from("people").select("id, full_name, role").ilike("full_name", like).limit(6),
        supabase.from("production_companies").select("id, name, city").ilike("name", like).limit(6),
        supabase.from("spanish_films").select("id, title, year").ilike("title", like).limit(6),
        supabase.from("target_accounts").select("id, name, status").ilike("name", like).limit(6),
        supabase.from("opportunities").select("id, title, statuses").ilike("title", like).limit(6),
        supabase.from("deal_memos").select("id, referencia, obra").or(`obra.ilike.${like},referencia.ilike.${like}`).limit(6),
      ]);
      const hits: Hit[] = [];
      for (const c of composers.data ?? [])
        hits.push({ id: `c${c.id}`, label: c.full_name, sub: c.roster_role, group: "Roster", go: () => navigate({ to: "/composers/$composerId", params: { composerId: c.id } }) });
      for (const p of people.data ?? [])
        hits.push({ id: `p${p.id}`, label: p.full_name, sub: p.role, group: "Personas", go: () => navigate({ to: "/people/$personId", params: { personId: p.id } }) });
      for (const c of companies.data ?? [])
        hits.push({ id: `co${c.id}`, label: c.name, sub: c.city, group: "Productoras", go: () => navigate({ to: "/production-companies/$companyId", params: { companyId: c.id } }) });
      for (const f of films.data ?? [])
        hits.push({ id: `f${f.id}`, label: f.title, sub: f.year ? String(f.year) : null, group: "CRM Películas ES", go: () => navigate({ to: "/peliculas-es", search: { q: f.title } as never }) });
      for (const a of accounts.data ?? [])
        hits.push({ id: `ta${a.id}`, label: a.name, sub: a.status, group: "Cuentas objetivo", go: () => navigate({ to: "/marketing/target-accounts/$accountId", params: { accountId: a.id } }) });
      for (const o of opportunities.data ?? [])
        hits.push({ id: `o${o.id}`, label: o.title, sub: o.statuses?.[0] ?? null, group: "Oportunidades", go: () => navigate({ to: "/opportunities/$opportunityId", params: { opportunityId: o.id } }) });
      for (const d of dealMemos.data ?? [])
        hits.push({ id: `dm${d.id}`, label: d.obra, sub: d.referencia, group: "Deal memos", go: () => navigate({ to: "/deal-memos/$dealMemoId", params: { dealMemoId: d.id } }) });
      return hits;
    },
  });

  const hits = resultsQ.data ?? [];
  const groups = Array.from(new Set(hits.map((h) => h.group)));
  const iconFor = (g: string) =>
    g === "Roster" ? Music : g === "Personas" ? Users : g === "Productoras" ? Building2 :
    g === "CRM Películas ES" ? Film : g === "Cuentas objetivo" ? Target :
    g === "Oportunidades" ? Crosshair : FileSignature;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Búsqueda global"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Buscar…</span>
        <kbd className="hidden rounded-sm border border-border px-1 font-mono text-[10px] md:inline">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQ(""); setTerm(""); } }}>
        <CommandInput value={q} onValueChange={setQ} placeholder="Buscar en roster, personas, películas, cuentas, deal memos…" />
        <CommandList>
          {term.length < 2 ? (
            <CommandEmpty>Escribe al menos 2 caracteres.</CommandEmpty>
          ) : resultsQ.isFetching && hits.length === 0 ? (
            <CommandEmpty>Buscando…</CommandEmpty>
          ) : hits.length === 0 ? (
            <CommandEmpty>Sin resultados.</CommandEmpty>
          ) : (
            groups.map((g) => {
              const Icon = iconFor(g);
              return (
                <CommandGroup key={g} heading={g}>
                  {hits.filter((h) => h.group === g).map((h) => (
                    <CommandItem
                      key={h.id}
                      value={`${h.label} ${h.sub ?? ""} ${h.id}`}
                      onSelect={() => { setOpen(false); h.go(); }}
                    >
                      <Icon className="mr-2 h-4 w-4 opacity-60" />
                      <span>{h.label}</span>
                      {h.sub && <span className="ml-2 text-xs text-muted-foreground">{h.sub}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
