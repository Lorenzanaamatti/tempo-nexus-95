import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";

/** Archiva una oportunidad guardando motivo y fecha, o la desarchiva. */
export function OpportunityArchiveButton({
  opportunityId,
  archivedAt,
  onDone,
}: {
  opportunityId: string;
  archivedAt?: string | null;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function archive() {
    if (!reason.trim()) return toast.error("Indica el motivo del archivado");
    setSaving(true);
    const { error } = await (supabase as any)
      .from("opportunities")
      .update({
        archived_at: new Date(`${date}T12:00:00`).toISOString(),
        archived_reason: reason.trim(),
      })
      .eq("id", opportunityId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Oportunidad archivada");
    setOpen(false);
    setReason("");
    onDone?.();
  }

  async function unarchive() {
    const { error } = await (supabase as any)
      .from("opportunities")
      .update({ archived_at: null, archived_reason: null })
      .eq("id", opportunityId);
    if (error) return toast.error(error.message);
    toast.success("Oportunidad restaurada");
    onDone?.();
  }

  if (archivedAt) {
    return (
      <Button variant="ghost" size="sm" aria-label="Desarchivar" title="Desarchivar" onClick={() => void unarchive()}>
        <ArchiveRestore className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Archivar" title="Archivar">
          <Archive className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archivar oportunidad</DialogTitle>
          <DialogDescription>
            La oportunidad deja de estar en la lista activa, pero se conserva con su motivo y fecha de archivado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="archive-reason">Motivo</Label>
            <Textarea
              id="archive-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Expirada, adjudicada a otro, sin respuesta…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="archive-date">Fecha de archivado</Label>
            <Input id="archive-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => void archive()} disabled={saving}>Archivar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
