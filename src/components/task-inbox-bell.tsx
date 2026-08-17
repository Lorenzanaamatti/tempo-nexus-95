import { Link } from "@tanstack/react-router";
import { Bell, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useMyPersonId } from "@/lib/use-my-tasks";
import {
  useNotifications,
  useMarkNotificationsRead,
  usePendingAssignments,
  useRespondAssignment,
} from "@/lib/use-notifications";
import { cn } from "@/lib/utils";

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `hace ${Math.max(mins, 1)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function TaskInboxBell() {
  const personId = useMyPersonId().data ?? null;
  const notifQ = useNotifications();
  const pendingQ = usePendingAssignments(personId);
  const markRead = useMarkNotificationsRead();
  const respond = useRespondAssignment();

  const notifications = notifQ.data ?? [];
  const pending = pendingQ.data ?? [];
  const unread = notifications.filter((n) => !n.read_at);
  const count = unread.length + pending.length;

  async function answer(actionId: string, accept: boolean) {
    try {
      await respond.mutateAsync({ actionId, accept });
      toast.success(accept ? "Tarea aceptada" : "Tarea rechazada");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo registrar la respuesta");
    }
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open && unread.length) markRead.mutate(unread.map((n) => n.id));
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={count ? `Notificaciones: ${count} sin leer` : "Notificaciones"}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="font-display text-sm">Notificaciones</p>
          <p className="text-[11px] text-muted-foreground">
            {count > 0 ? `${count} sin atender` : "Todo al día"}
          </p>
        </div>

        {pending.length > 0 && (
          <div className="border-b border-border bg-primary/5">
            <p className="px-3 pt-2 smallcaps text-[10px] text-muted-foreground">
              Pendientes de aceptar
            </p>
            <ul className="divide-y divide-border">
              {pending.map((t) => (
                <li key={t.id} className="px-3 py-2">
                  <p className="text-sm">{t.title}</p>
                  <p className="mt-0.5 smallcaps text-[10px] text-muted-foreground">
                    {[t.subarea, t.due_date ? `entrega ${t.due_date}` : null].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="h-7" disabled={respond.isPending} onClick={() => answer(t.id, true)}>
                      <Check className="mr-1 h-3 w-3" /> Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      disabled={respond.isPending}
                      onClick={() => answer(t.id, false)}
                    >
                      <X className="mr-1 h-3 w-3" /> Rechazar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="max-h-72 divide-y divide-border overflow-auto">
          {notifications.slice(0, 12).map((n) => (
            <li key={n.id} className={cn("px-3 py-2 text-sm", !n.read_at && "bg-muted/40")}>
              <p className={cn(!n.read_at && "font-medium")}>{n.title}</p>
              {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-0.5 smallcaps text-[10px] text-muted-foreground">{relative(n.created_at)}</p>
            </li>
          ))}
          {notifications.length === 0 && pending.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">No tienes notificaciones.</li>
          )}
        </ul>

        <div className="border-t border-border px-3 py-2 text-right">
          <Link to="/tareas" className="text-xs underline">Ver tareas</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
