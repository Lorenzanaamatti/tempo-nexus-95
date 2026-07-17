import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/_admin/candidacies/")({
  component: CandidaciesIndex,
});

const STATUS_LABEL = {
  nueva: "Nueva",
  revisando: "Revisando",
  descartada: "Descartada",
  promovida: "Promovida a roster",
} as const;
type Status = keyof typeof STATUS_LABEL;

const STATUS_TONE: Record<Status, string> = {
  nueva: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  revisando: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  descartada: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  promovida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const SOURCE_LABEL = {
  recibida: "Solicitud recibida",
  job_post: "Respuesta a job post",
} as const;
type Source = keyof typeof SOURCE_LABEL;

function CandidaciesIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSource, setNewSource] = useState<Source>("recibida");
  const [newJobPost, setNewJobPost] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newLinks, setNewLinks] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["candidacies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("candidacies")
        .select("*, reviewer:people(full_name), promoted_composer:composers(full_name, artistic_name)")
        .order("received_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((c: any) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const hay = `${c.full_name ?? ""} ${c.email ?? ""} ${c.job_post_title ?? ""} ${c.message ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    const links = newLinks
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await (supabase as any).from("candidacies").insert({
      full_name: newName.trim(),
      email: newEmail.trim() || null,
      source: newSource,
      job_post_title: newSource === "job_post" ? newJobPost.trim() || null : null,
      message: newMessage.trim() || null,
      links,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewName(""); setNewEmail(""); setNewSource("recibida"); setNewJobPost(""); setNewMessage(""); setNewLinks("");
    toast.success("Candidatura registrada");
    qc.invalidateQueries({ queryKey: ["candidacies"] });
  }

  async function updateStatus(id: string, status: Status) {
    const { error } = await (supabase as any).from("candidacies").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["candidacies"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta candidatura?")) return;
    const { error } = await (supabase as any).from("candidacies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminada");
    qc.invalidateQueries({ queryKey: ["candidacies"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Oportunidades</p>
          <h1 className="mt-1 font-display text-5xl">CANDIDATURAS</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Solicitudes recibidas de compositores y respuestas a job posts publicados en redes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-56 rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              {(Object.keys(SOURCE_LABEL) as Source[]).map((s) => (
                <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-56 rounded-sm" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-4 sm:grid-cols-12">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del compositor…" className="sm:col-span-3" />
        <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="sm:col-span-3" />
        <div className="sm:col-span-3">
          <Select value={newSource} onValueChange={(v) => setNewSource(v as Source)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(SOURCE_LABEL) as Source[]).map((s) => (
                <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {newSource === "job_post" && (
          <Input value={newJobPost} onChange={(e) => setNewJobPost(e.target.value)} placeholder="Título del job post" className="sm:col-span-3" />
        )}
        <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Mensaje / presentación del candidato" className="sm:col-span-12" rows={2} />
        <Textarea value={newLinks} onChange={(e) => setNewLinks(e.target.value)} placeholder="Enlaces (uno por línea o separados por comas): web, demo, redes…" className="sm:col-span-11" rows={2} />
        <Button onClick={create} disabled={creating} className="sm:col-span-1"><Plus className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !filtered.length ? (
        <p className="text-sm text-muted-foreground">Sin candidaturas.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c: any) => (
            <li key={c.id} className="rounded-sm border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-display text-lg">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {SOURCE_LABEL[(c.source ?? "recibida") as Source]}
                    {c.job_post_title ? ` · ${c.job_post_title}` : ""}
                    {c.email ? ` · ${c.email}` : ""}
                    {c.received_at ? ` · ${formatDateEs(c.received_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${STATUS_TONE[(c.status ?? "nueva") as Status]}`}>
                    {STATUS_LABEL[(c.status ?? "nueva") as Status]}
                  </span>
                  <Select value={c.status ?? "nueva"} onValueChange={(v) => updateStatus(c.id, v as Status)}>
                    <SelectTrigger className="h-8 w-40 rounded-sm text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              {c.message && <p className="mt-3 whitespace-pre-wrap text-sm">{c.message}</p>}
              {Array.isArray(c.links) && c.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.links.map((l: string, i: number) => (
                    <a key={i} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs hover:bg-muted">
                      <ExternalLink className="h-3 w-3" /> {l.replace(/^https?:\/\//, "").slice(0, 40)}
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}