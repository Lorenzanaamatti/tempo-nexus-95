import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Upload, FileText, Paperclip } from "lucide-react";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/_admin/candidacies/")({
  component: CandidaciesIndex,
});

const STATUS_LABEL = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  respondida: "Respondida",
} as const;
type Status = keyof typeof STATUS_LABEL;

const STATUS_TONE: Record<Status, string> = {
  pendiente: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  en_revision: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  respondida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const RESPONSE_LABEL = {
  sin_responder: "Sin responder",
  en_espera: "En espera",
  respondida_si: "Respondida · sí",
  respondida_no: "Respondida · no",
} as const;
type ResponseStatus = keyof typeof RESPONSE_LABEL;

const RESPONSE_TONE: Record<ResponseStatus, string> = {
  sin_responder: "bg-muted text-muted-foreground",
  en_espera: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  respondida_si: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  respondida_no: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

// Map legacy DB values to new UI keys
function normalizeStatus(s: string | null | undefined): Status {
  if (s === "revisando") return "en_revision";
  if (s === "promovida" || s === "respondida") return "respondida";
  if (s === "en_revision" || s === "pendiente") return s;
  return "pendiente"; // nueva / descartada / null
}

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
  const [openId, setOpenId] = useState<string | null>(null);

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

  const { data: team } = useQuery({
    queryKey: ["people", "ic_team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, full_name")
        .eq("role", "ic_team")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((c: any) => {
    if (statusFilter !== "all" && normalizeStatus(c.status) !== statusFilter) return false;
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
      status: "pendiente",
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

  async function updateReviewer(id: string, reviewer_id: string | null) {
    const { error } = await (supabase as any).from("candidacies").update({ reviewer_id }).eq("id", id);
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
          {filtered.map((c: any) => {
            const st = normalizeStatus(c.status);
            return (
              <li key={c.id} className="rounded-sm border border-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <button className="text-left" onClick={() => setOpenId(c.id)}>
                    <p className="font-display text-lg hover:underline">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.received_at ? `Recibida ${formatDateEs(c.received_at)}` : ""}
                      {" · "}{SOURCE_LABEL[(c.source ?? "recibida") as Source]}
                      {c.job_post_title ? ` · ${c.job_post_title}` : ""}
                      {c.email ? ` · ${c.email}` : ""}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${STATUS_TONE[st]}`}>
                      {STATUS_LABEL[st]}
                    </span>
                    <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${RESPONSE_TONE[(c.response_status ?? "sin_responder") as ResponseStatus]}`}>
                      {RESPONSE_LABEL[(c.response_status ?? "sin_responder") as ResponseStatus]}
                    </span>
                    <Select value={st} onValueChange={(v) => updateStatus(c.id, v as Status)}>
                      <SelectTrigger className="h-8 w-36 rounded-sm text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={c.reviewer_id ?? "none"}
                      onValueChange={(v) => updateReviewer(c.id, v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-8 w-44 rounded-sm text-xs">
                        <SelectValue placeholder="Responsable IC" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin responsable</SelectItem>
                        {(team ?? []).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
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
            );
          })}
        </ul>
      )}

      <CandidacyDetailSheet
        candidacyId={openId}
        onClose={() => setOpenId(null)}
        team={team ?? []}
      />
    </div>
  );
}

function CandidacyDetailSheet({
  candidacyId,
  onClose,
  team,
}: {
  candidacyId: string | null;
  onClose: () => void;
  team: any[];
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: c } = useQuery({
    queryKey: ["candidacy", candidacyId],
    queryFn: async () => {
      if (!candidacyId) return null;
      const { data, error } = await (supabase as any)
        .from("candidacies")
        .select("*")
        .eq("id", candidacyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!candidacyId,
  });

  const { data: files } = useQuery({
    queryKey: ["candidacy_files", candidacyId],
    queryFn: async () => {
      if (!candidacyId) return [];
      const { data, error } = await (supabase as any)
        .from("candidacy_files")
        .select("*")
        .eq("candidacy_id", candidacyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!candidacyId,
  });

  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [linksText, setLinksText] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (c && loadedFor !== c.id) {
    setPhone(c.phone ?? "");
    setNotes(c.notes ?? "");
    setLinksText(Array.isArray(c.links) ? c.links.join("\n") : "");
    setLoadedFor(c.id);
  }

  async function save() {
    if (!c) return;
    const links = linksText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    const { error } = await (supabase as any)
      .from("candidacies")
      .update({ phone: phone.trim() || null, notes: notes.trim() || null, links })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["candidacies"] });
    qc.invalidateQueries({ queryKey: ["candidacy", c.id] });
  }

  async function upload(fs: FileList | null) {
    if (!c || !fs || fs.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(fs)) {
        const path = `${c.id}/${Date.now()}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("candidacy-files").upload(path, f);
        if (upErr) throw upErr;
        const { data: userData } = await supabase.auth.getUser();
        const { error: insErr } = await (supabase as any).from("candidacy_files").insert({
          candidacy_id: c.id,
          storage_path: path,
          file_name: f.name,
          mime_type: f.type || null,
          size_bytes: f.size,
          uploaded_by: userData.user?.id ?? null,
        });
        if (insErr) throw insErr;
      }
      toast.success("Archivos subidos");
      qc.invalidateQueries({ queryKey: ["candidacy_files", c.id] });
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from("candidacy-files").createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "No se pudo abrir");
    window.open(data.signedUrl, "_blank");
  }

  async function removeFile(id: string, path: string) {
    if (!confirm("¿Eliminar archivo?")) return;
    await supabase.storage.from("candidacy-files").remove([path]);
    const { error } = await (supabase as any).from("candidacy_files").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["candidacy_files", c?.id] });
  }

  return (
    <Sheet open={!!candidacyId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{c?.full_name ?? "Candidatura"}</SheetTitle>
        </SheetHeader>
        {!c ? (
          <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="text-xs text-muted-foreground">
              {c.received_at ? `Recibida ${formatDateEs(c.received_at)}` : ""}
              {" · "}{SOURCE_LABEL[(c.source ?? "recibida") as Source]}
              {c.email ? ` · ${c.email}` : ""}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="smallcaps text-muted-foreground">Responsable IC</Label>
                <Select
                  value={c.reviewer_id ?? "none"}
                  onValueChange={async (v) => {
                    const val = v === "none" ? null : v;
                    await (supabase as any).from("candidacies").update({ reviewer_id: val }).eq("id", c.id);
                    qc.invalidateQueries({ queryKey: ["candidacies"] });
                    qc.invalidateQueries({ queryKey: ["candidacy", c.id] });
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin responsable</SelectItem>
                    {team.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="smallcaps text-muted-foreground">Estado de la respuesta</Label>
                <Select
                  value={(c.response_status ?? "sin_responder") as ResponseStatus}
                  onValueChange={async (v) => {
                    const patch: any = { response_status: v };
                    if (v !== "sin_responder" && !c.response_at) patch.response_at = new Date().toISOString();
                    if (v === "sin_responder") patch.response_at = null;
                    await (supabase as any).from("candidacies").update(patch).eq("id", c.id);
                    qc.invalidateQueries({ queryKey: ["candidacies"] });
                    qc.invalidateQueries({ queryKey: ["candidacy", c.id] });
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RESPONSE_LABEL) as ResponseStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{RESPONSE_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {c.response_at && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Última actualización: {formatDateEs(c.response_at)}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="smallcaps text-muted-foreground">Teléfono</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="smallcaps text-muted-foreground">Web y otros enlaces (uno por línea)</Label>
              <Textarea value={linksText} onChange={(e) => setLinksText(e.target.value)} rows={4} className="mt-1" />
            </div>

            <div>
              <Label className="smallcaps text-muted-foreground">Anotaciones internas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="mt-1" />
            </div>

            <div className="flex justify-end">
              <Button onClick={save}>Guardar cambios</Button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between">
                <Label className="smallcaps text-muted-foreground flex items-center gap-2">
                  <Paperclip className="h-3 w-3" /> Documentos
                </Label>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => upload(e.target.files)}
                  />
                  <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Subiendo…" : "Subir archivos"}
                  </Button>
                </div>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  upload(e.dataTransfer.files);
                }}
                onClick={() => fileRef.current?.click()}
                className={`mb-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40"
                }`}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm">
                  {uploading ? "Subiendo…" : "Arrastra archivos aquí"}
                </p>
                <p className="text-[11px] text-muted-foreground">o haz clic para seleccionarlos</p>
              </div>
              {(!files || files.length === 0) ? (
                <p className="text-xs text-muted-foreground">Sin documentos aún.</p>
              ) : (
                <ul className="space-y-1">
                  {files.map((f: any) => (
                    <li key={f.id} className="flex items-center justify-between rounded-sm border border-border px-2 py-1 text-sm">
                      <button className="flex items-center gap-2 hover:underline" onClick={() => openFile(f.storage_path)}>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {f.file_name}
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(f.id, f.storage_path)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}