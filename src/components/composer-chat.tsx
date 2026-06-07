import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCurrentRole } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Trash2, FileText, Download, Hash } from "lucide-react";
import { toast } from "sonner";
import { formatDateEs } from "@/lib/dates";

type Channel = { id: string; kind: string; label: string; position: number };
type Attachment = { name: string; path?: string; url?: string; mime?: string; size?: number; kind: "file" | "link" };
type Message = {
  id: string;
  channel_id: string;
  body: string | null;
  attachments: Attachment[];
  author_user_id: string;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const t = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? t : `${formatDateEs(d.toISOString().slice(0, 10))} · ${t}`;
}

export function ComposerChat({ composerId }: { composerId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { role } = useCurrentRole();
  const [activeId, setActiveId] = useState<string | null>(null);

  const channelsQ = useQuery({
    queryKey: ["chat-channels", composerId],
    queryFn: async (): Promise<Channel[]> => {
      // Asegura los canales por defecto si faltan
      await supabase.rpc("ensure_composer_chat_channels", { _composer_id: composerId });
      const { data, error } = await supabase
        .from("chat_channels")
        .select("id, kind, label, position")
        .eq("composer_id", composerId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Channel[];
    },
  });

  useEffect(() => {
    if (!activeId && channelsQ.data?.length) setActiveId(channelsQ.data[0].id);
  }, [channelsQ.data, activeId]);

  const messagesQ = useQuery({
    queryKey: ["chat-messages", activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, channel_id, body, attachments, author_user_id, author_name, author_role, created_at")
        .eq("channel_id", activeId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // Realtime para el canal activo
  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`chat-msg-${activeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeId}` },
        () => qc.invalidateQueries({ queryKey: ["chat-messages", activeId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeId, qc]);

  const active = channelsQ.data?.find((c) => c.id === activeId) ?? null;

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <aside className="rounded-sm border border-border bg-card/40 p-2">
        <ul className="space-y-0.5">
          {(channelsQ.data ?? []).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition ${
                  c.id === activeId ? "bg-primary/15 text-foreground" : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Hash className="h-3.5 w-3.5 opacity-60" />
                <span className="truncate">{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex min-h-[480px] flex-col rounded-sm border border-border bg-background">
        <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <p className="font-display text-base">{active?.label ?? "Selecciona un canal"}</p>
        </header>
        <MessageList messages={messagesQ.data ?? []} currentUserId={user?.id ?? null} composerId={composerId} />
        {active && user && (
          <Composer
            channelId={active.id}
            composerId={composerId}
            authorUserId={user.id}
            authorName={user.user_metadata?.full_name || user.email || "Usuario"}
            authorRole={role ?? "user"}
            onSent={() => qc.invalidateQueries({ queryKey: ["chat-messages", active.id] })}
          />
        )}
      </div>
    </div>
  );
}

function MessageList({
  messages,
  currentUserId,
  composerId,
}: {
  messages: Message[];
  currentUserId: string | null;
  composerId: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const qc = useQueryClient();
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const onDelete = async (m: Message) => {
    if (!confirm("¿Eliminar mensaje?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    // Limpia adjuntos del bucket si los hubiera
    const paths = (m.attachments ?? []).filter((a) => a.kind === "file" && a.path).map((a) => a.path!);
    if (paths.length) await supabase.storage.from("chat-attachments").remove(paths);
    qc.invalidateQueries({ queryKey: ["chat-messages", m.channel_id] });
  };

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No hay mensajes en este canal todavía.</p>
      ) : (
        messages.map((m) => {
          const mine = m.author_user_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-sm border px-3 py-2 ${
                  mine ? "border-primary/40 bg-primary/10" : "border-border bg-card/60"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="smallcaps text-[10px] text-muted-foreground">
                    {m.author_name ?? "—"} {m.author_role === "admin" ? "· IC" : ""}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{fmtTime(m.created_at)}</span>
                </div>
                {m.body && <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>}
                {m.attachments?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {m.attachments.map((a, i) => (
                      <li key={i}>
                        <AttachmentLink att={a} composerId={composerId} />
                      </li>
                    ))}
                  </ul>
                )}
                {mine && (
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onDelete(m)}
                      className="text-[10px] text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function AttachmentLink({ att, composerId: _composerId }: { att: Attachment; composerId: string }) {
  const [url, setUrl] = useState<string | null>(att.url ?? null);
  useEffect(() => {
    let cancelled = false;
    if (att.kind === "file" && att.path && !url) {
      supabase.storage
        .from("chat-attachments")
        .createSignedUrl(att.path, 60 * 60)
        .then(({ data }) => {
          if (!cancelled) setUrl(data?.signedUrl ?? null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [att, url]);
  if (!url) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><FileText className="h-3 w-3" />{att.name}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary underline"
    >
      {att.kind === "file" ? <Download className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
      {att.name}
    </a>
  );
}

function Composer({
  channelId,
  composerId,
  authorUserId,
  authorName,
  authorRole,
  onSent,
}: {
  channelId: string;
  composerId: string;
  authorUserId: string;
  authorName: string;
  authorRole: string;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed && files.length === 0 && !link.trim()) return;
    setSending(true);
    try {
      const attachments: Attachment[] = [];
      for (const f of files) {
        const path = `${composerId}/${channelId}/${Date.now()}-${crypto.randomUUID()}-${f.name}`;
        const { error } = await supabase.storage
          .from("chat-attachments")
          .upload(path, f, { contentType: f.type, upsert: false });
        if (error) throw error;
        attachments.push({ name: f.name, path, mime: f.type, size: f.size, kind: "file" });
      }
      if (link.trim()) {
        attachments.push({ name: link.trim(), url: link.trim(), kind: "link" });
      }
      const { error } = await supabase.from("chat_messages").insert({
        channel_id: channelId,
        composer_id: composerId,
        author_user_id: authorUserId,
        author_name: authorName,
        author_role: authorRole,
        body: trimmed || null,
        attachments: attachments as unknown as never,
      });
      if (error) throw error;
      setBody("");
      setFiles([]);
      setLink("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSent();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-border p-3">
      {(files.length > 0 || link) && (
        <ul className="mb-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {files.map((f, i) => (
            <li key={i} className="rounded-sm border border-border px-2 py-0.5">
              📎 {f.name}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-destructive"
                onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            </li>
          ))}
          {link && <li className="rounded-sm border border-border px-2 py-0.5">🔗 {link}</li>}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escribe un mensaje… (Ctrl/⌘+Enter para enviar)"
          rows={2}
          className="min-h-[44px] flex-1"
        />
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
          />
          <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} title="Adjuntar archivo">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={sending}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700"
            title="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="O pega un enlace (Drive, Dropbox, web…)"
        className="mt-2 w-full rounded-sm border border-border bg-transparent px-2 py-1 text-xs"
      />
    </div>
  );
}