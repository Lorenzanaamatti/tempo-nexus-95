import { useMemo, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

export interface SuggestOption {
  id: string;
  label: string;
  hint?: string;
}

interface Props {
  value: string;
  onChange: (value: string, picked?: SuggestOption) => void;
  options: SuggestOption[];
  placeholder?: string;
}

export function SuggestInput({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [value, options]);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-sm border border-border bg-popover shadow-lg">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  onChange(m.label, m);
                  setOpen(false);
                }}
              >
                <span className="text-sm">{m.label}</span>
                {m.hint && <span className="smallcaps text-[10px] text-muted-foreground">{m.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}