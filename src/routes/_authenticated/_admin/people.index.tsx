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

export const Route = createFileRoute("/_authenticated/_admin/people/")({
  component: PeopleIndex,
  validateSearch: (s: Record<string, unknown>): { role: PersonRole | "all" } => {
    const allowed: ReadonlyArray<PersonRole | "all"> = [
      "all", "ic_team", "composer", "artist", "supervisor", "specialist", "curator", "other",
    ];
    const v = typeof s.role === "string" ? s.role : "all";
    return { role: (allowed.includes(v as PersonRole | "all") ? v : "all") as PersonRole | "all" };
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
  const setRoleFilter = (v: PersonRole | "all") =>
    navigate({ search: { role: v }, replace: true });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<PersonRole>(
    roleFilter !== "all" && roleFilter !== "composer" ? roleFilter : "ic_team",
  );

  const { data, isLoading } = useQuery({
    queryKey: ["people", q, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("people")
        .select("id, full_name, role, email, phone, composer_id")
        .order("full_name");
      if (roleFilter !== "all") query = query.eq("role", roleFilter);
      if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("people").insert({ full_name: newName.trim(), role: newRole });
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewName("");
    toast.success("Persona añadida");
    qc.invalidateQueries({ queryKey: ["people"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Roster</p>
          <h1 className="mt-1 font-display text-5xl italic">{ROLE_TITLE[roleFilter as PersonRole | "all"]}</h1>
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
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border p-4">
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
        <p className="ml-auto text-xs italic text-muted-foreground">
          Para crear un compositor usa el módulo Roster.
        </p>
      </div>

      {isLoading ? (
        <p className="font-display italic text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin personas.</p>
      ) : (
        <div className="divide-y divide-border rounded-sm border border-border">
          {data.map((p) => (
            <Link
              key={p.id}
              to="/people/$personId"
              params={{ personId: p.id }}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-muted/40"
            >
              <span className="font-display text-lg italic">{p.full_name}</span>
              <Badge variant="outline" className="rounded-sm">{ROLE_LABEL[p.role as PersonRole]}</Badge>
              {p.email && <span className="text-xs text-muted-foreground">{p.email}</span>}
              {p.composer_id && <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">↪ ficha de compositor</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}