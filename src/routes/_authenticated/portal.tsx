import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

function PortalLayout() {
  const { composerId } = useCurrentRole();
  const { user } = useAuth();
  const { data: unread = 0 } = useQuery({
    queryKey: ["portal-unread", composerId, user?.id],
    enabled: !!composerId && !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: read } = await supabase
        .from("chat_message_reads")
        .select("last_read_at")
        .eq("user_id", user!.id)
        .eq("composer_id", composerId!)
        .maybeSingle();
      const since = read?.last_read_at ?? "1970-01-01T00:00:00Z";
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("composer_id", composerId!)
        .neq("author_user_id", user!.id)
        .gt("created_at", since);
      return count ?? 0;
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-10 py-14">
      <header className="mb-12 flex items-start justify-between gap-6">
        <div>
          <p className="smallcaps text-muted-foreground">Portal del representado</p>
          <h1 className="mt-3 font-display text-5xl tracking-tight">Tu espacio privado</h1>
          <div className="mt-6 h-px w-16 bg-primary/70" />
        </div>
        <Link
          to="/portal/chat"
          aria-label={`Buzón${unread ? `: ${unread} sin leer` : ""}`}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/40 transition hover:border-primary/60"
        >
          <Mail className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </header>
      <Outlet />
    </div>
  );
}