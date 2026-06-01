import { Badge } from "@/components/ui/badge";

export function MultiChipSelect<T extends { id?: string; code?: string; label: string }>({
  options,
  selected,
  onToggle,
  getKey,
}: {
  options: T[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  getKey: (o: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const k = getKey(o);
        const active = selected.has(k);
        return (
          <button
            type="button"
            key={k}
            onClick={() => onToggle(k)}
            className="focus:outline-none"
          >
            <Badge
              variant={active ? "default" : "outline"}
              className="cursor-pointer rounded-sm font-normal"
            >
              {o.label}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}