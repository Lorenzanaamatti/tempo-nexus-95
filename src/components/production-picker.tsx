import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type ProductionOption = { id: string; title: string };

const collator = new Intl.Collator("es", { sensitivity: "base" });

/** Quita tildes y mayúsculas para que «maleta» encuentre «La Maleta». */
function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Desplegable de producciones en el que se puede escribir para buscarlas.
 * Sustituye al desplegable normal cuando la lista es larga.
 */
export function ProductionPicker({
  productions,
  value,
  onChange,
  placeholder = "Sin producción",
  clearLabel = "Sin producción",
  loading = false,
  className,
  disabled = false,
}: {
  productions: ProductionOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  clearLabel?: string;
  loading?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...productions].sort((a, b) => collator.compare(a.title ?? "", b.title ?? "")),
    [productions],
  );

  const results = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return sorted;
    return sorted.filter((p) => {
      const hay = normalize(p.title ?? "");
      return words.every((w) => hay.includes(w));
    });
  }, [sorted, query]);

  const selected = productions.find((p) => p.id === value) ?? null;

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={placeholder}
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected ? selected.title : loading ? "Cargando…" : placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Escribe para buscar la producción…"
          />
          <CommandList className="max-h-64">
            <CommandEmpty>Sin resultados para «{query.trim()}».</CommandEmpty>
            <CommandItem value={`__none__`} onSelect={() => pick("")}>
              <Check className={cn("opacity-60", value ? "opacity-0" : "opacity-100")} />
              <span>{clearLabel}</span>
            </CommandItem>
            {results.map((p) => (
              <CommandItem key={p.id} value={p.id} onSelect={() => pick(p.id)}>
                <Check className={cn("opacity-60", value === p.id ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{p.title}</span>
              </CommandItem>
            ))}
          </CommandList>
          {results.length > 0 && (
            <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              {results.length === sorted.length
                ? `${sorted.length} producciones`
                : `${results.length} de ${sorted.length} producciones`}
            </p>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
