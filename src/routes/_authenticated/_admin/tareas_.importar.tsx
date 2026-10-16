import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMyPersonId } from "@/lib/use-my-tasks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TASK_AREAS, type TaskArea } from "@/lib/task-areas";
import { todayISO } from "@/lib/task-status";
import { formatDateEs } from "@/lib/dates";
import {
  CLAUDE_INSTRUCTIONS, URGENCY_LABEL, buildNotes, buildTitle, canImportTasks,
  parseUrgency, resolveDueDate, taskImportSchema, type TaskImportRow,
} from "@/lib/task-import";
import { importTasks } from "@/lib/task-import.functions";
import { Copy, Download, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/tareas_/importar")({
  head: () => ({
    meta: [
      { title: "Importar tareas · Interesante" },
      { name: "description", content: "Pega el JSON extraído del Excel para crear tareas en bloque." },
      { property: "og:title", content: "Importar tareas · Interesante" },
      { property: "og:description", content: "Ingesta de tareas desde JSON." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportTasksPage,
});

type Row = { id: number; raw: TaskImportRow; title: string; notes: string; due: string | null; errors: string[]; duplicate: boolean; selected: boolean };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

function ImportTasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const myPersonId = useMyPersonId().data;
  const runImport = useServerFn(importTasks);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [area, setArea] = useState<TaskArea>("general");
  const [assignee, setAssignee] = useState<string>("__me");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const peopleQ = useQuery({
    queryKey: ["people-all-for-tasks"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("people").select("id, full_name").order("full_name");
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  const allowed = canImportTasks(user?.email);
  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);

  if (!allowed) return <div className="p-8 text-sm text-muted-foreground">Esta función no está disponible para tu cuenta.</div>;

  async function review() {
    setResult(null);
    let parsed: unknown;
    try { parsed = JSON.parse(text.trim().replace(/^```(json)?|```$/g, "")); } catch { return toast.error("El texto pegado no es un JSON válido."); }
    const res = taskImportSchema.safeParse(Array.isArray(parsed) ? { tareas: parsed } : parsed);
    if (!res.success) return toast.error("El JSON no tiene la forma esperada (lista «tareas»).");
    const { data: existing } = await (supabase as any).from("actions").select("title").eq("done", false).limit(5000);
    const titles = new Set(((existing ?? []) as { title: string }[]).map((e) => norm(e.title)));
    const today = todayISO();
    setRows(res.data.tareas.map((raw, i) => {
      const errors: string[] = [];
      const title = buildTitle(raw);
      if (!title) errors.push("Falta el texto de la tarea");
      if (raw.fecha && !resolveDueDate({ fecha: raw.fecha }, today)) errors.push("Fecha ilegible");
      const duplicate = !!title && titles.has(norm(title));
      return { id: i, raw, title, notes: buildNotes(raw), due: resolveDueDate(raw, today), errors, duplicate, selected: !errors.length && !duplicate };
    }));
  }

  async function save() {
    const chosen = rows.filter((r) => r.selected && !r.errors.length);
    if (!chosen.length) return;
    const assigneeId = assignee === "__me" ? (myPersonId ?? null) : assignee === "__none" ? null : assignee;
    setSaving(true);
    try {
      const { created } = await runImport({ data: {
        area, assignee_person_id: assigneeId,
        rows: chosen.map((r) => ({ title: r.title, notes: r.notes || null, due_date: r.due, subarea: r.raw.categoria ?? null })),
      } });
      const omitted = rows.filter((r) => !r.selected && r.duplicate).length;
      const rejected = rows.filter((r) => r.errors.length).length;
      const msg = `${created} tareas creadas · ${omitted} duplicadas omitidas · ${rejected} rechazadas`;
      setResult(msg); toast.success(msg); setRows([]); setText("");
      ["tasks", "task-inbox", "my-due-tasks", "notifications"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo importar.");
    } finally { setSaving(false); }
  }

  function copyInstructions() { navigator.clipboard.writeText(CLAUDE_INSTRUCTIONS); toast.success("Instrucciones copiadas"); }
  function downloadInstructions() {
    const url = URL.createObjectURL(new Blob([CLAUDE_INSTRUCTIONS], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "instrucciones-claude-tareas.txt"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/tareas" className="inline-flex items-center text-xs text-muted-foreground hover:underline"><ArrowLeft className="mr-1 h-3 w-3" />Tareas</Link>
          <h1 className="font-display text-3xl text-primary">Importar tareas</h1>
          <p className="text-sm text-muted-foreground">Pega el JSON que te devuelve Claude a partir del Excel. Solo se crean tareas nuevas; nada se borra.</p>
        </div>
      </div>

      <section className="space-y-2 rounded-sm border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">1 · Instrucciones para Claude</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyInstructions}><Copy className="mr-1 h-4 w-4" />Copiar instrucciones</Button>
            <Button size="sm" variant="outline" onClick={downloadInstructions}><Download className="mr-1 h-4 w-4" />Descargar</Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Adjunta el Excel a Claude y pega estas instrucciones. Por defecto lee la pestaña NUEVAS; si quieres otra, díselo en el mismo mensaje.</p>
        <details><summary className="cursor-pointer text-sm">Ver instrucciones</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-sm bg-muted p-3 text-xs">{CLAUDE_INSTRUCTIONS}</pre></details>
      </section>

      <section className="space-y-3 rounded-sm border border-border p-4">
        <h2 className="font-medium">2 · Pega el JSON</h2>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="font-mono text-xs" placeholder='{ "tareas": [ ... ] }' />
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48"><Label>Área</Label>
            <Select value={area} onValueChange={(v) => setArea(v as TaskArea)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="w-64"><Label>Responsable de todo el lote</Label>
            <Select value={assignee} onValueChange={setAssignee}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__me">Yo</SelectItem>
                <SelectItem value="__none">Sin responsable</SelectItem>
                {(peopleQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent></Select></div>
          <Button onClick={review} disabled={!text.trim()}>Revisar</Button>
        </div>
        {result && <p className="text-sm text-primary">{result}</p>}
      </section>

      {rows.length > 0 && (
        <section className="space-y-3">
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left"><tr>
                <th className="p-2">Incluir</th><th className="p-2">Tarea</th><th className="p-2">Persona / Cliente</th>
                <th className="p-2">Entrega</th><th className="p-2">Urgencia</th><th className="p-2">Categoría</th><th className="p-2">Estado</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => { const u = parseUrgency(r.raw.urgencia); return (
                  <tr key={r.id} className={r.errors.length ? "opacity-60" : ""}>
                    <td className="p-2"><Checkbox disabled={!!r.errors.length} checked={r.selected} onCheckedChange={(v) => setRows((all) => all.map((x) => x.id === r.id ? { ...x, selected: !!v } : x))} /></td>
                    <td className="p-2 max-w-md">{r.title || "—"}</td>
                    <td className="p-2 text-xs">{[r.raw.persona, r.raw.cliente].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{r.due ? formatDateEs(r.due) : "—"}</td>
                    <td className="p-2 whitespace-nowrap">{u ? `${u} ${URGENCY_LABEL[u]}` : "—"}</td>
                    <td className="p-2 text-xs">{r.raw.categoria ?? "—"}</td>
                    <td className="p-2 text-xs">{r.errors.length ? <span className="text-destructive">{r.errors.join(" · ")}</span> : r.duplicate ? "Posible duplicado" : "Nueva"}</td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end"><Button onClick={save} disabled={saving || !selectedCount}>{saving ? "Importando…" : `Importar ${selectedCount} tareas`}</Button></div>
        </section>
      )}
    </div>
  );
}
