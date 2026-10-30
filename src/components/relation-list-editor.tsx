import { useState } from "react";
import { EmptyState } from "@/components/list-states";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { savedToast } from "@/lib/saved-feedback";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "url" | "tags";
  placeholder?: string;
  className?: string;
  audio?: boolean;
};

/**
 * Vínculo de cada fila con el catálogo de estilos de la app (music_styles).
 * La tabla intermedia debe apuntar a la fila con `rowKey` y a `style_id`,
 * y llevar `composer_id` para que RLS pueda validar el permiso.
 */
export type RowStyleLinks = {
  table: string;
  rowKey: string;
  options: { id: string; label: string }[];
  linkedByRow: Record<string, string[]>;
};

const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|oga|flac|webm|opus)(\?|$)/i;

function isAudioUrl(value: unknown) {
  return typeof value === "string" && AUDIO_EXT.test(value.trim());
}

function TagsField({
  value,
  placeholder,
  onChange,
}: {
  value: unknown;
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const tags = Array.isArray(value) ? (value as string[]) : [];
  const [text, setText] = useState("");

  function add() {
    const t = text.trim();
    setText("");
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sin etiquetas todavía.</span>
        ) : (
          tags.map((t) => (
            <Badge key={t} variant="outline" className="rounded-sm font-normal">
              {t}
              <button
                type="button"
                onClick={() => onChange(tags.filter((x) => x !== t))}
                className="ml-2 text-muted-foreground hover:text-foreground"
                aria-label={`Quitar ${t}`}
              >
                ×
              </button>
            </Badge>
          ))
        )}
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder ?? "Escribe y pulsa Enter"}
      />
    </div>
  );
}

export function RelationListEditor<T extends { id: string; position: number }>({
  title,
  table,
  composerId,
  rows,
  fields,
  newDefaults,
  onChange,
  styles,
}: {
  title: string;
  table: "composer_demos" | "composer_filmography" | "composer_awards" | "composer_documents";
  composerId: string;
  rows: T[];
  fields: FieldDef[];
  newDefaults: Record<string, unknown>;
  onChange: (rows: T[]) => void;
  styles?: RowStyleLinks;
}) {
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState<Record<string, string[]>>(styles?.linkedByRow ?? {});

  async function add() {
    setBusy(true);
    const { data, error } = await (supabase as any)
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
    const { error } = await (supabase as any).from(table).update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else savedToast();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este elemento?")) return;
    const prev = rows;
    onChange(rows.filter((r) => r.id !== id));
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) {
      onChange(prev);
      toast.error(error.message);
    }
  }

  async function toggleStyle(rowId: string, styleId: string) {
    if (!styles) return;
    const current = linked[rowId] ?? [];
    const has = current.includes(styleId);
    setLinked((prev) => ({
      ...prev,
      [rowId]: has ? current.filter((x) => x !== styleId) : [...current, styleId],
    }));
    if (has) {
      const { error } = await (supabase as any)
        .from(styles.table)
        .delete()
        .eq(styles.rowKey, rowId)
        .eq("style_id", styleId);
      if (error) toast.error(error.message);
    } else {
      const { error } = await (supabase as any).from(styles.table).insert({
        [styles.rowKey]: rowId,
        composer_id: composerId,
        style_id: styleId,
      });
      if (error) toast.error(error.message);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={busy}>
          + Añadir
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState variant="inline" title="Sin entradas" description="Añade la primera desde el campo de arriba." />
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
                    ) : f.type === "tags" ? (
                      <div className="mt-1">
                        <TagsField
                          value={(r as any)[f.key]}
                          placeholder={f.placeholder}
                          onChange={(next) => update(r.id, { [f.key]: next })}
                        />
                      </div>
                    ) : (
                      <>
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
                        {f.audio && isAudioUrl((r as any)[f.key]) && (
                          <audio
                            controls
                            preload="none"
                            src={String((r as any)[f.key]).trim()}
                            className="mt-2 w-full"
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {styles && styles.options.length > 0 && (
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">
                    Estilos del catálogo
                  </Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {styles.options.map((o) => {
                      const on = (linked[r.id] ?? []).includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggleStyle(r.id, o.id)}
                          aria-pressed={on}
                          className={
                            "rounded-sm border px-2.5 py-1 text-xs transition-colors " +
                            (on
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground")
                          }
                        >
                          {on ? "✓ " : ""}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
