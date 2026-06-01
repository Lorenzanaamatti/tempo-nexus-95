import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "url";
  placeholder?: string;
  className?: string;
};

export function RelationListEditor<T extends { id: string; position: number }>({
  title,
  table,
  composerId,
  rows,
  fields,
  newDefaults,
  onChange,
}: {
  title: string;
  table: "composer_demos" | "composer_filmography" | "composer_awards";
  composerId: string;
  rows: T[];
  fields: FieldDef[];
  newDefaults: Record<string, unknown>;
  onChange: (rows: T[]) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const { data, error } = await supabase
      .from(table)
      .insert({
        composer_id: composerId,
        position: (rows.at(-1)?.position ?? -1) + 1,
        ...newDefaults,
      })
      .select("*")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    onChange([...rows, data as T]);
  }

  async function update(id: string, patch: Record<string, unknown>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este elemento?")) return;
    const prev = rows;
    onChange(rows.filter((r) => r.id !== id));
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      onChange(prev);
      toast.error(error.message);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl italic">{title}</h2>
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={busy}>
          + Añadir
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Sin entradas.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-sm border border-border bg-card/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.key} className={f.className}>
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        defaultValue={(r as any)[f.key] ?? ""}
                        placeholder={f.placeholder}
                        rows={2}
                        onBlur={(e) =>
                          (e.target.value || "") !== ((r as any)[f.key] ?? "") &&
                          update(r.id, { [f.key]: e.target.value || null })
                        }
                      />
                    ) : (
                      <Input
                        type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                        defaultValue={(r as any)[f.key] ?? ""}
                        placeholder={f.placeholder}
                        onBlur={(e) => {
                          const raw = e.target.value;
                          const v =
                            f.type === "number" ? (raw ? Number(raw) : null) : raw || null;
                          if (v !== ((r as any)[f.key] ?? null)) update(r.id, { [f.key]: v });
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}