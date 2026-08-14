import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function DealMemoNotas({ dm }: { dm: any }) {
  const [value, setValue] = useState(dm.notas_internas ?? "");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(value);

  useEffect(() => {
    if (value === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving("saving");
      const { error } = await supabase.from("deal_memos").update({ notas_internas: value || null }).eq("id", dm.id);
      if (error) { toast.error(error.message); setSaving("idle"); return; }
      lastSaved.current = value;
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1500);
    }, 3000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, dm.id]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Las notas se autoguardan tras 3 segundos de inactividad.</p>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {saving === "saving" ? "Guardando…" : saving === "saved" ? "Guardado" : ""}
        </span>
      </div>
      <Textarea rows={14} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Notas internas del equipo…" />
    </div>
  );
}
