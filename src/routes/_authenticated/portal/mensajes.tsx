import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import {
  MessageSquare,
  Film,
  Target,
  Receipt,
  ScrollText,
  FileSignature,
  CalendarDays,
  Folder,
  ArrowUpRight,
  Paperclip,
} from "lucide-react";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/portal/mensajes")({
  component: Mensajes,
});

type Channel = { id: string; kind: string; label: string; position: number };
type LastMsg = {
  channel_id: string;
  body: string | null;
  author_name: string | null;
  author_user_id: string;
  created_at: string;
  attachments: { name: string }[] | null;
};

const CATEGORY_META: Record<
  string,
  { icon: typeof MessageSquare; gradient: string; description: string }
> = {
  general:      { icon: MessageSquare,  gradient: "from-[#6c5ce7] to-[#a78bfa]", description: "Conversación general con tu equipo." },
  producciones: { icon: Film,           gradient: "from-[#ff6b6b] to-[#c44569]", description: "Avisos sobre producciones en curso." },
  oportunidades:{ icon: Target,         gradient: "from-[#f7931e] to-[#e85d3a]", description: "Nuevas oportunidades y propuestas." },
  facturacion:  { icon: Receipt,        gradient: "from-[#0d7a5f] to-[#2dd4a8]", description: "Pagos, facturas y liquidaciones." },
  contratos:    { icon: ScrollText,     gradient: "from-[#c9a84c] to-[#f0d78c]", description: "Borradores, firmas y modificaciones." },
  actas:        { icon: FileSignature,  gradient: "from-[#2e6b8a] to-[#5cbdb9]", description: "Actas de reuniones con IC." },
  calendario:   { icon: CalendarDays,   gradient: "from-[#c44569] to-[#6c5ce7]", description: "Citas, hitos y recordatorios." },
};

function fmtWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return formatDateEs(d.toISOString().slice(0, 10));
}

function Mensajes() {
  const { composerId } = useCurrentRole();
  const { user } = useAuth();

  const channelsQ = useQuery({
    queryKey: ["portal-channels", composerId],
    enabled: !!composerId,
    queryFn: async (): Promise<Channel[]> => {
      await supabase.rpc("ensure_composer_chat_channels", { _composer_id: composerId! });
      const { data } = await supabase
        .from("chat_channels")
        .select("id, kind, label, position")
        .eq("composer_id", composerId!)
        .order("position");
      return (data ?? []) as Channel[];
    },
  });

  const readQ = useQuery({
    queryKey: ["portal-last-read", composerId, user?.id],
    enabled: !!composerId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_message_reads")
        .select("last_read_at")
        .eq("user_id", user!.id)
        .eq("composer_id", composerId!)
        .maybeSingle();
      return data?.last_read_at ?? null;
    },
  });

  const messagesQ = useQuery({
    queryKey: ["portal-channel-messages", composerId, channelsQ.data?.map((c) => c.id).join(",")],
    enabled: !!composerId && !!channelsQ.data?.length,
    queryFn: async () => {
      const ids = channelsQ.data!.map((c) => c.id);
      const { data } = await supabase
        .from("chat_messages")
        .select("channel_id, body, author_name, author_user_id, created_at, attachments")
        .in("channel_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as LastMsg[];
    },
  });

  const docsQ = useQuery({
    queryKey: ["portal-materiales", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("composer_documents")
        .select("id, title, kind, url, notes, created_at")
        .eq("composer_id", composerId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const lastRead = readQ.data ? new Date(readQ.data).getTime() : 0;
  const byChannel = new Map<string, LastMsg[]>();
  for (const m of messagesQ.data ?? []) {
    if (!byChannel.has(m.channel_id)) byChannel.set(m.channel_id, []);
    byChannel.get(m.channel_id)!.push(m);
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="smallcaps text-xs text-foreground/55">Bandeja</p>
        <h2 className="mt-1 font-display text-4xl tracking-tight">Mensajes y chat</h2>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70">
          Tus conversaciones con el equipo IC, agrupadas por categoría. Abre cualquier categoría para ver el historial completo y responder.
        </p>
      </header>

      {!channelsQ.data?.length ? (
        <p className="text-sm text-foreground/60">Cargando categorías…</p>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {channelsQ.data.map((ch) => {
            const meta = CATEGORY_META[ch.kind] ?? {
              icon: MessageSquare,
              gradient: "from-foreground/60 to-foreground/40",
              description: "Mensajes de esta categoría.",
            };
            const msgs = byChannel.get(ch.id) ?? [];
            const last = msgs[0];
            const unread = msgs.filter(
              (m) => m.author_user_id !== user?.id && new Date(m.created_at).getTime() > lastRead,
            ).length;
            const Icon = meta.icon;
            return (
              <Link
                key={ch.id}
                to="/portal/chat"
                search={{ ch: ch.id }}
                className="portal-card portal-card-hover group relative flex flex-col gap-3 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-md transition group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display text-lg leading-tight">{ch.label}</p>
                      {unread > 0 && (
                        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#c44569] px-1.5 text-[10px] font-semibold text-white shadow">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground/55">{meta.description}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-white/40 p-3 ring-1 ring-black/5">
                  {last ? (
                    <>
                      <div className="flex items-baseline justify-between gap-2 text-[11px] text-foreground/55">
                        <span className="truncate font-medium text-foreground/70">{last.author_name ?? "—"}</span>
                        <span>{fmtWhen(last.created_at)}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/80">
                        {last.body || (last.attachments?.length ? (
                          <span className="inline-flex items-center gap-1 text-foreground/60"><Paperclip className="h-3 w-3" /> {last.attachments[0].name}</span>
                        ) : <span className="italic text-foreground/40">Sin contenido</span>)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm italic text-foreground/40">Sin mensajes todavía.</p>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-foreground/55">
                  <span>{msgs.length} mensaje{msgs.length === 1 ? "" : "s"}</span>
                  <span className="inline-flex items-center gap-1 text-foreground/70 group-hover:text-foreground">
                    Abrir <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-white shadow-md">
            <Folder className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-2xl">Materiales compartidos</h3>
            <p className="text-xs text-foreground/55">Documentos y enlaces que IC ha vinculado a tu ficha.</p>
          </div>
        </div>
        {!docsQ.data?.length ? (
          <p className="portal-card p-5 text-sm text-foreground/60">Aún no hay materiales compartidos.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {docsQ.data.map((d) => (
              <li key={d.id} className="portal-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-base">{d.title}</p>
                  {d.kind && <span className="smallcaps text-[10px] text-foreground/55">{d.kind}</span>}
                </div>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline">
                    Abrir <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
                {d.notes && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-foreground/65">{d.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}