import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

export interface CreatableOption {
  id: string;
  label: string;
  hint?: string;
}

interface Props {
  value: string;
  options: CreatableOption[];
  placeholder?: string;
  /** Called when an existing option is picked (id) or the text is cleared ("") */
  onPick: (id: string, label: string) => void;
  /** Create a new CRM record with the typed text; must return the new id */
  onCreate: (label: string) => Promise<string | null>;
  createLabel?: string;
}

/**
 * Select-like input that also accepts free text and creates the record
 * in the corresponding CRM table.
 */
export function CreatableSelect({ value, options, placeholder, onPick, onCreate, createLabel = "Crear en el CRM" }: Props) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(value); }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = text.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options).slice(0, 8),
    [q, options],
  );
  const exact = options.some((o) => o.label.trim().toLowerCase() === q);

  async function create() {
    const label = text.trim();
    if (!label || busy) return;
    setBusy(true);
    const id = await onCreate(label);
    setBusy(false);
    if (id) {
      onPick(id, label);
      setText(label);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <Input
        value={text}
        placeholder={placeholder ?? "Escribe o selecciona…"}
        onChange={(e) => { setText(e.target.value); setOpen(true); if (!e.target.value.trim()) onPick("", ""); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q && !exact) { e.preventDefault(); void create(); }
        }}
      />
      {open && (matches.length > 0 || (!!q && !exact)) && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-border bg-popover shadow-lg">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted"
                onClick={() => { onPick(m.id, m.label); setText(m.label); setOpen(false); }}
              >
                <span className="text-sm">{m.label}</span>
                {m.hint && <span className="smallcaps text-[10px] text-muted-foreground">{m.hint}</span>}
              </button>
            </li>
          ))}
          {!!q && !exact && (
            <li>
              <button
                type="button"
                disabled={busy}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-muted disabled:opacity-50"
                onClick={() => void create()}
              >
                <Plus className="h-3.5 w-3.5" />
                {createLabel}: «{text.trim()}»
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
