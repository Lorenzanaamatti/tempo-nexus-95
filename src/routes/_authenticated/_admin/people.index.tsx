import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { IC_FUNCTION_GROUPS, IC_FUNCTION_LABEL, type IcTeamFunction } from "@/components/person-ic-functions-editor";

export const Route = createFileRoute("/_authenticated/_admin/people/")({
  component: PeopleIndex,
  validateSearch: (s: Record<string, unknown>): { role: PersonRole | "all"; fn?: IcTeamFunction | "all" } => {
    const allowed: ReadonlyArray<PersonRole | "all"> = [
      "all", "ic_team", "composer", "artist", "supervisor", "specialist", "curator", "other",
    ];
    const v = typeof s.role === "string" ? s.role : "all";
    const fn = typeof s.fn === "string" ? s.fn : "all";
    return {
      role: (allowed.includes(v as PersonRole | "all") ? v : "all") as PersonRole | "all",
      fn: fn as IcTeamFunction | "all",
    };
  },
});

type PersonRole = "ic_team" | "composer" | "artist" | "supervisor" | "specialist" | "curator" | "other";
const ROLE_LABEL: Record<PersonRole, string> = {
  ic_team: "Equipo IC",
  composer: "Compositor",
  artist: "Artista",
  supervisor: "Supervisor",
  specialist: "Especialista",
  curator: "Curador musical",
  other: "Otros",
};
const ROLE_TITLE: Record<PersonRole | "all", string> = {
  all: "Personas",
  ic_team: "Equipo IC",
  composer: "Compositores",
  artist: "Artistas",
  supervisor: "Supervisores musicales",
  specialist: "Especialistas",
  curator: "Curadores musicales",
  other: "Otros",
};

function PeopleIndex() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const roleFilter = search.role;
  const fnFilter = (search.fn ?? "all") as IcTeamFunction | "all";
  const setRoleFilter = (v: PersonRole | "all") =>
    navigate({ search: { role: v, fn: "all" }, replace: true });
  const setFnFilter = (v: IcTeamFunction | "all") =>
    navigate({ search: { role: roleFilter, fn: v }, replace: true });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<PersonRole>(
    roleFilter !== "all" && roleFilter !== "composer" ? roleFilter : "ic_team",
  );
  const [newFn, setNewFn] = useState<IcTeamFunction | "none">("none");

  const { data, isLoading } = useQuery({
    queryKey: ["people", q, roleFilter, fnFilter],
    queryFn: async () => {
      let query = supabase
        .from("people")
        .select("id, full_name, role, email, phone, composer_id, person_ic_functions(function)")
        .order("full_name");
      if (roleFilter !== "all") query = query.eq("role", roleFilter);
      if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string; full_name: string; role: string; email: string | null; phone: string | null; composer_id: string | null;
        person_ic_functions: { function: IcTeamFunction }[] | null;
      }>;
      const mapped = rows.map((r) => ({ ...r, fns: (r.person_ic_functions ?? []).map((f) => f.function) }));
      if (roleFilter === "ic_team" && fnFilter !== "all") {
        return mapped.filter((r) => r.fns.includes(fnFilter));
      }
      return mapped;
    },
  });

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    let error: { message: string } | null = null;
    if (newRole === "ic_team") {
      const res = await supabase
        .from("people")
        .insert({ full_name: newName.trim(), role: newRole })
        .select("id")
        .single();
      error = res.error;
      if (!res.error && res.data && newFns.size > 0) {
        await (supabase as any).from("person_ic_functions").insert(
          Array.from(newFns).map((fn) => ({ person_id: res.data!.id, function: fn })),
        );
      }
    } else {
      // Roster roles live in composers (sync trigger mirrors them into people).
      const base = newName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "persona";
      const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
      const res = await supabase.from("composers").insert({ full_name: newName.trim(), slug, roster_role: newRole });
      error = res.error;
    }
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewName("");
    setNewFn("none");
    toast.success("Persona añadida");
    qc.invalidateQueries({ queryKey: ["people"] });
    qc.invalidateQueries({ queryKey: ["roster-all"] });
    qc.invalidateQueries({ queryKey: ["composers"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Roster</p>
          <h1 className="mt-1 font-display text-5xl">{ROLE_TITLE[roleFilter as PersonRole | "all"]}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Directorio del roster. Los compositores aparecen automáticamente desde su módulo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre…" className="w-56 rounded-sm" />
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as PersonRole | "all")}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {(Object.keys(ROLE_LABEL) as PersonRole[]).map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roleFilter === "ic_team" && (
            <Select value={fnFilter} onValueChange={(v) => setFnFilter(v as IcTeamFunction | "all")}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Filtrar por función…" /></SelectTrigger>
              <SelectContent className="max-h-96">
                <SelectItem value="all">Todas las funciones</SelectItem>
                {IC_FUNCTION_GROUPS.map((g) => (
                  <div key={g.label}>
                    <div className="smallcaps px-2 py-1 text-[10px] text-muted-foreground">{g.label}</div>
                    {g.items.map((it) => (
                      <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="mb-6 space-y-3 rounded-sm border border-dashed border-border p-4">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre completo"
            className="w-64"
          />
          <Select value={newRole} onValueChange={(v) => setNewRole(v as PersonRole)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as PersonRole[]).map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={create} disabled={creating || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Añadir persona
          </Button>
          <p className="ml-auto text-xs text-muted-foreground">
            Para crear un compositor usa el módulo Roster.
          </p>
        </div>
        {newRole === "ic_team" && (
          <div className="space-y-2 border-t border-dashed border-border pt-3">
            <p className="smallcaps text-[10px] text-muted-foreground">Funciones iniciales (opcional, multi-selección)</p>
            <div className="flex flex-wrap gap-1.5">
              {IC_FUNCTION_GROUPS.flatMap((g) => g.items).map((it) => {
                const active = newFns.has(it.value);
                return (
                  <button
                    type="button"
                    key={it.value}
                    onClick={() => {
                      const next = new Set(newFns);
                      if (active) next.delete(it.value); else next.add(it.value);
                      setNewFns(next);
                    }}
                    className={`rounded-sm border px-2 py-0.5 text-[11px] transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground"}`}
                  >
                    {it.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin personas.</p>
      ) : (
        <div className="divide-y divide-border rounded-sm border border-border">
          {data.map((p) => (
            <Link
              key={p.id}
              to="/people/$personId"
              params={{ personId: p.id }}
              className="flex flex-wrap items-center gap-2 px-4 py-3 transition hover:bg-muted/40"
            >
              <span className="font-display text-lg">{p.full_name}</span>
              <Badge variant="outline" className="rounded-sm">{ROLE_LABEL[p.role as PersonRole]}</Badge>
              {p.role === "ic_team" && p.fns?.map((fn) => (
                <Badge key={fn} variant="secondary" className="rounded-sm text-[10px]">
                  {IC_FUNCTION_LABEL[fn]}
                </Badge>
              ))}
              {p.email && <span className="text-xs text-muted-foreground">{p.email}</span>}
              {p.composer_id && <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">↪ ficha de compositor</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}