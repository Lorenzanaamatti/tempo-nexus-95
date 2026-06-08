import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAssistant } from "@/lib/assistants.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export function AssistantChat({ personId, name }: { personId: string; name: string }) {
  const call = useServerFn(chatWithAssistant);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await call({ data: { personId, messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply || "(sin respuesta)" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al consultar a Claude");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-sm border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-display text-lg">Chat con {name}</span>
        </div>
        <Badge variant="outline" className="rounded-sm smallcaps text-[10px]">Claude · Anthropic</Badge>
      </div>
      <div className="max-h-[420px] min-h-[200px] space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Empieza una conversación con {name}. Sus respuestas se generan con Claude y siguen su rol definido en el equipo IC.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "mr-auto max-w-[85%] rounded-sm bg-muted px-3 py-2 text-sm"
            }
          >
            <div className="mb-1 text-[10px] uppercase tracking-wider opacity-70">
              {m.role === "user" ? "Tú" : name}
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> {name} está pensando…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder={`Pregunta algo a ${name}… (Cmd/Ctrl+Enter para enviar)`}
          className="resize-none"
        />
        <Button onClick={send} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}