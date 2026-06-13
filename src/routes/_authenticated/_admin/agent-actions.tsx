import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { approveAgentAction, rejectAgentAction } from "@/lib/assistants.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { AGENT_TOOLS_BY_NAME } from "@/lib/agent-tools";

export const Route = createFileRoute("/_authenticated/_admin/agent-actions")({
  component: AgentActionsPage,
});

type Row = {
  id: string;
  agent_person_id: string;
  tool_name: string;
  payload: Record<string, unknown>;
  summary: string | null;
  status: "pending" | "approved" | "rejected" | "failed";
  requested_at: string;
  decided_at: string | null;
  decision_notes: string | null;
  resulting_entity_kind: string | null;
  resulting_entity_id: string | null;
  error_message: string | null;
  agent?: { full_name: string } | null;
};

const STATUS_LABEL: Record<Row["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  failed: "Error",
};
const STATUS_VARIANT: Record<Row["status"], "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  approved: "secondary",
  rejected: "outline",
  failed: "destructive",
};

function AgentActionsPage() {
  const [filter, setFilter] = useState<Row["status"] | "all">("pending");
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["agent-actions", filter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("agent_actions")
        .select("*, agent:people!agent_actions_agent_person_id_fkey(full_name)")
        .order("requested_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="flex items-center gap-3 font-display text-4xl">
          <Sparkles className="h-7 w-7 text-primary" />
          Acciones de agentes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Propuestas generadas por los agentes virtuales (AIDA, AINARA, AITANA, AITOR) en sus chats.
          Revísalas y aprueba o rechaza antes de que se ejecuten.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected", "failed", "all"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "Todas" : STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> Cargando…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada por aquí.</p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((r) => (
            <ActionRow key={r.id} row={r} onChange={() => refetch()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionRow({ row, onChange }: { row: Row; onChange: () => void }) {
  const approve = useServerFn(approveAgentAction);
  const reject = useServerFn(rejectAgentAction);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const def = AGENT_TOOLS_BY_NAME[row.tool_name];

  async function doApprove() {
    setBusy(true);
    try {
      const res = await approve({ data: { actionId: row.id, notes: notes || undefined } });
      toast.success(`Aprobada y ejecutada (${res.entity_kind})`);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  async function doReject() {
    setBusy(true);
    try {
      await reject({ data: { actionId: row.id, notes: notes || undefined } });
      toast.success("Rechazada");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-sm border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[row.status]} className="rounded-sm">{STATUS_LABEL[row.status]}</Badge>
          <span className="font-display text-lg">{def?.label ?? row.tool_name}</span>
          {row.agent?.full_name && (
            <span className="smallcaps text-[10px] text-muted-foreground">· {row.agent.full_name}</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(row.requested_at).toLocaleString("es-ES")}
        </span>
      </div>
      {row.summary && <p className="mb-2 text-sm">{row.summary}</p>}
      <details className="mb-2">
        <summary className="cursor-pointer text-[11px] text-muted-foreground">Ver datos completos</summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-sm bg-muted p-2 text-[11px]">
          {JSON.stringify(row.payload, null, 2)}
        </pre>
      </details>
      {row.error_message && (
        <p className="mb-2 text-xs text-destructive">Error: {row.error_message}</p>
      )}
      {row.decision_notes && (
        <p className="mb-2 text-[11px] text-muted-foreground">Notas: {row.decision_notes}</p>
      )}
      {row.status === "approved" && row.resulting_entity_kind === "deal_memo" && row.resulting_entity_id && (
        <Link
          to="/deal-memos/$dealMemoId"
          params={{ dealMemoId: row.resulting_entity_id }}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Abrir deal memo creado
        </Link>
      )}
      {row.status === "pending" && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notas opcionales para el agente (opcional)…"
            className="text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={doReject} disabled={busy}>
              <X className="mr-1 h-3 w-3" /> Rechazar
            </Button>
            <Button size="sm" onClick={doApprove} disabled={busy}>
              <Check className="mr-1 h-3 w-3" /> Aprobar y ejecutar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}