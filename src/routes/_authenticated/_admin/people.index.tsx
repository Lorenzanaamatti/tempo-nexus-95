import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Sparkles, User } from "lucide-react";
import { IC_FUNCTION_GROUPS, IC_FUNCTION_LABEL, type IcTeamFunction } from "@/components/person-ic-functions-editor";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/_admin/people/")({
  component: PeopleIndex,
  validateSearch: (s: Record<string, unknown>): { fn?: IcTeamFunction | "all" } => {
    const fn = typeof s.fn === "string" ? s.fn : "all";
    return { fn: fn as IcTeamFunction | "all" };
  },
});

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

  const { data, isLoading } = useQuery({
    queryKey: ["people-ic", q, fnFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("people")
        .select("id, full_name, role, email, phone, is_virtual_assistant, person_ic_functions(function)")
        .eq("role", "ic_team")
        .order("full_name");
      if (typeFilter === "real") query = query.eq("is_virtual_assistant", false);
      if (typeFilter === "virtual") query = query.eq("is_virtual_assistant", true);
      if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string; full_name: string; role: string; email: string | null; phone: string | null; is_virtual_assistant: boolean;
        person_ic_functions: { function: IcTeamFunction }[] | null;
      }>;
      const mapped = rows.map((r) => ({ ...r, fns: (r.person_ic_functions ?? []).map((f) => f.function) }));
      if (fnFilter !== "all") {
        return mapped.filter((r) => r.fns.includes(fnFilter));
      }
      return mapped;
    },
  });

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
      await (supabase as any).from("person_ic_functions").insert({
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
          <h1 className="mt-1 font-display text-5xl">Equipo IC</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Directorio del equipo interno. El roster de compositores se gestiona en su propio módulo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre…" className="w-56 rounded-sm" />
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
        <p className="font-display text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin personas en el Equipo IC.</p>
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
              <Badge variant="outline" className="rounded-sm text-[10px]">
                {p.is_virtual_assistant ? (
                  <><Sparkles className="mr-1 h-3 w-3" /> Agente virtual</>
                ) : (
                  <><User className="mr-1 h-3 w-3" /> Persona real</>
                )}
              </Badge>
              {p.fns?.map((fn) => (
                <Badge key={fn} variant="secondary" className="rounded-sm text-[10px]">
                  {IC_FUNCTION_LABEL[fn]}
                </Badge>
              ))}
              {p.email && <span className="text-xs text-muted-foreground">{p.email}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}