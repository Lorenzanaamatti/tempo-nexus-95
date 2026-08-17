import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Sparkles, User, Users } from "lucide-react";
import { IC_FUNCTION_GROUPS, type IcTeamFunction } from "@/components/person-ic-functions-editor";
import { IcFunctionTags } from "@/components/ic-function-tags";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PaginationBar, SortControl, useServerPagination } from "@/components/pagination-bar";
import { ListSkeleton, EmptyState } from "@/components/list-states";

export const Route = createFileRoute("/_authenticated/_admin/people/")({
  component: PeopleIndex,
  validateSearch: (s: Record<string, unknown>): { fn?: IcTeamFunction | "all" } => {
    const fn = typeof s.fn === "string" ? s.fn : "all";
    return { fn: fn as IcTeamFunction | "all" };
  },
});

type PeopleSortKey = "full_name" | "email" | "is_virtual_assistant" | "created_at";

const PEOPLE_SORT_OPTIONS: { key: PeopleSortKey; label: string }[] = [
  { key: "full_name", label: "nombre" },
  { key: "email", label: "email" },
  { key: "is_virtual_assistant", label: "tipo" },
  { key: "created_at", label: "fecha de alta" },
];

function PeopleIndex() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "real" | "virtual">("all");
  const fnFilter = (search.fn ?? "all") as IcTeamFunction | "all";
  const setFnFilter = (v: IcTeamFunction | "all") =>
    navigate({ search: { fn: v }, replace: true });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFn, setNewFn] = useState<IcTeamFunction | "none">("none");
  const [newVirtual, setNewVirtual] = useState(false);

  const pg = useServerPagination<PeopleSortKey>({ list: "personas",
    sortKey: "full_name",
    pageSize: 50,
    deps: [q, fnFilter, typeFilter],
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ["people-ic", q, fnFilter, typeFilter, pg.page, pg.pageSize, pg.sortKey, pg.sortDir],
    queryFn: async () => {
      const rel = fnFilter === "all" ? "person_ic_functions(function)" : "person_ic_functions!inner(function)";
      let query = supabase
        .from("people")
        .select(`id, full_name, role, email, phone, is_virtual_assistant, ${rel}`, { count: "exact" })
        .eq("role", "ic_team");
      if (typeFilter === "real") query = query.eq("is_virtual_assistant", false);
      if (typeFilter === "virtual") query = query.eq("is_virtual_assistant", true);
      if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
      if (fnFilter !== "all") query = query.eq("person_ic_functions.function", fnFilter);
      const { data, error, count } = await pg.applyTo(query);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string; full_name: string; role: string; email: string | null; phone: string | null; is_virtual_assistant: boolean;
        person_ic_functions: { function: IcTeamFunction }[] | null;
      }>;
      return {
        rows: rows.map((r) => ({ ...r, fns: (r.person_ic_functions ?? []).map((f) => f.function) })),
        count: count ?? 0,
      };
    },
    placeholderData: (prev) => prev,
  });

  const data = result?.rows;
  const total = result?.count ?? 0;

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await supabase
      .from("people")
      .insert({ full_name: newName.trim(), role: "ic_team", is_virtual_assistant: newVirtual })
      .select("id")
      .single();
    const error = res.error;
    if (!res.error && res.data && newFn !== "none") {
      await supabase.from("person_ic_functions").insert({
        person_id: res.data.id,
        function: newFn,
      });
    }
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewName("");
    setNewFn("none");
    setNewVirtual(false);
    toast.success("Persona añadida al Equipo IC");
    qc.invalidateQueries({ queryKey: ["people-ic"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Personal interno</p>
          <h1 className="mt-1 font-display text-5xl title-caps">Equipo IC</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Directorio del equipo interno. El roster de compositores se gestiona en su propio módulo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre…" className="w-56 rounded-sm" />
          <SortControl
            options={PEOPLE_SORT_OPTIONS}
            sortKey={pg.sortKey}
            sortDir={pg.sortDir}
            onSortKeyChange={pg.setSortKey}
            onSortDirChange={pg.setSortDir}
          />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="real">Personas reales</SelectItem>
              <SelectItem value="virtual">Agentes virtuales</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fnFilter} onValueChange={(v) => setFnFilter(v as IcTeamFunction | "all")}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Filtrar por función…" /></SelectTrigger>
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
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border p-4">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre completo"
          className="w-64"
        />
        <Select value={newFn} onValueChange={(v) => setNewFn(v as IcTeamFunction | "none")}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Función inicial…" /></SelectTrigger>
          <SelectContent className="max-h-96">
            <SelectItem value="none">Sin función inicial</SelectItem>
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
        <div className="flex items-center gap-2 rounded-sm border border-border px-3 py-2">
          <Switch id="new-virtual" checked={newVirtual} onCheckedChange={setNewVirtual} />
          <Label htmlFor="new-virtual" className="text-xs">Agente virtual (IA)</Label>
        </div>
        <Button onClick={create} disabled={creating || !newName.trim()}>
          <Plus className="mr-1 h-4 w-4" /> Añadir persona
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          Las personas reales no llevan verificador. Los agentes virtuales sí.
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : !data?.length ? (
        <EmptyState icon={Users} title="Sin personas en el equipo IC" description="Añade a la primera persona con el formulario de arriba para poder asignarle tareas y funciones." />
      ) : (
        <>
        <div className="divide-y divide-border rounded-sm border border-border">
          {(data ?? []).map((p) => (
            <Link
              key={p.id}
              to="/people/$personId"
              params={{ personId: p.id }}
              className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-4 py-3 transition hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-lg leading-tight">{p.full_name}</span>
                  {p.is_virtual_assistant ? (
                    <Badge variant="outline" className="rounded-sm text-[10px]">
                      <Sparkles className="mr-1 h-3 w-3" /> Agente virtual
                    </Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" /> Persona real
                    </span>
                  )}
                </div>
                <IcFunctionTags fns={(p.fns ?? []) as IcTeamFunction[]} />
              </div>
              <div className="shrink-0 text-right text-xs leading-relaxed text-muted-foreground">
                {p.email && <div className="truncate">{p.email}</div>}
                {p.phone && <div className="truncate">{p.phone}</div>}
              </div>
            </Link>
          ))}
        </div>
        <PaginationBar latencyMs={pg.lastLatencyMs} page={pg.page} pageCount={pg.pageCountOf(total)} pageSize={pg.pageSize} total={total} onPageChange={pg.setPage} onPageSizeChange={pg.setPageSize} label="personas" />
        </>
      )}
    </div>
  );
}