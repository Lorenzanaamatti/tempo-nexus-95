import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { EntitySubjectType } from "@/components/entity-actions-editor";

export function EntityDocumentsEditor({
  subjectType,
  subjectId,
  title = "Documentos",
}: {
  subjectType: EntitySubjectType;
  subjectId: string;
  title?: string;
}) {
  const qc = useQueryClient();
  const queryKey = ["documents", subjectType, subjectId];

  const docsQ = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("*")
        .eq("subject_type", subjectType)
        .eq("subject_id", subjectId)
        .order("position")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newKind, setNewKind] = useState("");
  const [newNotes, setNewNotes] = useState("");

  async function addDoc() {
    if (!newTitle.trim()) return;
    const { error } = await (supabase as any).from("documents").insert({
      subject_type: subjectType,
      subject_id: subjectId,
      title: newTitle.trim(),
      url: newUrl || null,
      kind: newKind || null,
      notes: newNotes || null,
      position: (docsQ.data?.length ?? 0),
    });
    if (error) return toast.error(error.message);
    setNewTitle(""); setNewUrl(""); setNewKind(""); setNewNotes("");
    qc.invalidateQueries({ queryKey });
  }

  async function removeDoc(id: string) {
    if (!confirm("¿Eliminar documento?")) return;
    const { error } = await (supabase as any).from("documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey });
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-2xl">{title}</h2>
      <div className="mb-3 grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-4 sm:grid-cols-[1fr,1fr,150px,auto]">
        <div>
          <Label className="text-xs">Título</Label>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nombre del documento" />
        </div>
        <div>
          <Label className="text-xs">URL</Label>
          <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Input value={newKind} onChange={(e) => setNewKind(e.target.value)} placeholder="contrato, EPK…" />
        </div>
        <div className="flex items-end">
          <Button onClick={addDoc}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
        </div>
        <div className="sm:col-span-4">
          <Label className="text-xs">Notas</Label>
          <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notas opcionales" />
        </div>
      </div>
      {docsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !docsQ.data?.length ? (
        <p className="text-sm text-muted-foreground">Sin documentos.</p>
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border">
          {docsQ.data.map((d: any) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1">
                <p className="font-display text-sm">{d.title}</p>
                <div className="flex flex-wrap gap-2 smallcaps text-[10px] text-muted-foreground">
                  {d.kind && <span>{d.kind}</span>}
                  {d.notes && <span>· {d.notes}</span>}
                </div>
              </div>
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={() => removeDoc(d.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}