import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, setUserAccess } from "@/lib/users-admin.functions";
import { ROLE_LABEL, type AppRole } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/_admin/users")({
  component: UsersPage,
});

const ROLE_OPTIONS: { value: AppRole; label: string; desc: string }[] = [
  { value: "admin", label: ROLE_LABEL.admin, desc: "Acceso total, incluido módulo económico" },
  { value: "team", label: ROLE_LABEL.team, desc: "Todo menos económico" },
  { value: "composer", label: ROLE_LABEL.composer, desc: "Solo su propio portal" },
];

function UsersPage() {
  const { isBigC, loading: roleLoading } = useCurrentRole();
  const fetchUsers = useServerFn(listUsers);
  const updateAccess = useServerFn(setUserAccess);
  const qc = useQueryClient();

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    enabled: isBigC,
    queryFn: () => fetchUsers(),
  });

  if (roleLoading) {
    return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  }
  if (!isBigC) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="smallcaps text-muted-foreground">Acceso restringido</p>
        <h1 className="mt-2 font-display text-4xl">Solo BIG C</h1>
      </div>
    );
  }

  const mut = useMutation({
    mutationFn: (vars: { userId: string; role: AppRole | null; status: "pending" | "active" | "rejected" }) =>
      updateAccess({ data: vars }),
    onSuccess: () => {
      toast.success("Acceso actualizado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const users = usersQ.data ?? [];
  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status === "active");
  const rejected = users.filter((u) => u.status === "rejected");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Acceso</p>
        <h1 className="font-display text-5xl">Usuarios y permisos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aprueba nuevas solicitudes y asigna roles. Tres niveles disponibles:{" "}
          <strong>BIG C</strong> (todo), <strong>TEAM</strong> (todo menos económico) y{" "}
          <strong>ROSTER</strong> (su portal personal).
        </p>
      </header>

      {usersQ.isLoading && (
        <p className="font-display text-muted-foreground">Cargando…</p>
      )}

      {!usersQ.isLoading && (
        <>
          <Section
            title="Pendientes de aprobación"
            icon={<Clock className="h-4 w-4" />}
            count={pending.length}
          >
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
            ) : (
              pending.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  onApprove={(role) =>
                    mut.mutate({ userId: u.id, role, status: "active" })
                  }
                  onReject={() =>
                    mut.mutate({ userId: u.id, role: null, status: "rejected" })
                  }
                />
              ))
            )}
          </Section>

          <Section title="Activos" icon={<Check className="h-4 w-4" />} count={active.length}>
            {active.map((u) => (
              <ActiveUserRow
                key={u.id}
                user={u}
                onChangeRole={(role) =>
                  mut.mutate({ userId: u.id, role, status: "active" })
                }
                onRevoke={() =>
                  mut.mutate({ userId: u.id, role: null, status: "rejected" })
                }
              />
            ))}
          </Section>

          {rejected.length > 0 && (
            <Section title="Rechazados" icon={<X className="h-4 w-4" />} count={rejected.length}>
              {rejected.map((u) => (
                <ActiveUserRow
                  key={u.id}
                  user={u}
                  onChangeRole={(role) =>
                    mut.mutate({ userId: u.id, role, status: "active" })
                  }
                  onRevoke={() =>
                    mut.mutate({ userId: u.id, role: null, status: "rejected" })
                  }
                />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title, icon, count, children,
}: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          {icon}
          {title}
        </h2>
        <span className="smallcaps text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function UserMeta({ user }: { user: any }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-display text-base">{user.display_name || user.email || "—"}</p>
      {user.email && (
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Alta {new Date(user.created_at).toLocaleDateString("es-ES")}
        {user.last_sign_in_at
          ? ` · Último acceso ${new Date(user.last_sign_in_at).toLocaleDateString("es-ES")}`
          : " · Nunca ha accedido"}
      </p>
    </div>
  );
}

function UserCard({
  user, onApprove, onReject,
}: { user: any; onApprove: (role: AppRole) => void; onReject: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-border p-4 sm:flex-row sm:items-center">
      <UserMeta user={user} />
      <div className="flex flex-wrap gap-2">
        {ROLE_OPTIONS.map((r) => (
          <Button
            key={r.value}
            size="sm"
            variant="outline"
            onClick={() => onApprove(r.value)}
            title={r.desc}
          >
            Aprobar como {r.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onReject}>
          Rechazar
        </Button>
      </div>
    </div>
  );
}

function ActiveUserRow({
  user, onChangeRole, onRevoke,
}: { user: any; onChangeRole: (role: AppRole) => void; onRevoke: () => void }) {
  const currentRole: AppRole | "" =
    user.roles.includes("admin") ? "admin"
    : user.roles.includes("team") ? "team"
    : user.roles.includes("composer") ? "composer"
    : "";

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-border p-4 sm:flex-row sm:items-center">
      <UserMeta user={user} />
      <div className="flex items-center gap-2">
        <Select
          value={currentRole}
          onValueChange={(v) => onChangeRole(v as AppRole)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sin rol" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={onRevoke}>
          Revocar
        </Button>
      </div>
    </div>
  );
}
