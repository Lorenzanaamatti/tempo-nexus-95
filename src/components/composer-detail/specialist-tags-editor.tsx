import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export const SPECIALIST_TAG_OPTIONS = [
  "Instrumentista",
  "Vocalista",
  "Director de orquesta",
  "Orquestador",
  "Copista",
  "Arreglista",
  "Ingeniero",
  "Editor",
  "Asistente",
  "Productor",
] as const;

export function SpecialistTagsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const selected = new Set(value);
  function toggle(tag: string) {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    onChange(Array.from(next));
  }
  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }
  const customs = value.filter((t) => !SPECIALIST_TAG_OPTIONS.includes(t as never));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {SPECIALIST_TAG_OPTIONS.map((tag) => {
          const active = selected.has(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`rounded-sm border px-2.5 py-1 text-xs transition ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {customs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customs.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        placeholder="Añadir etiqueta personalizada y pulsar Enter"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = (e.target as HTMLInputElement).value.trim();
            if (v && !selected.has(v)) onChange([...value, v]);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
    </div>
  );
}
