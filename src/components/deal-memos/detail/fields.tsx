import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-border bg-card p-4">
      <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{children}</div>
    </section>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <Label className="mb-1 text-xs text-muted-foreground">{label}</Label>}
      {children}
    </div>
  );
}

export function CrmEntitySelect({ value, onChange, items, disabled }: {
  value: string;
  onChange: (combo: string) => void;
  items: { kind: "composer" | "company"; id: string; label: string; group: string }[];
  disabled?: boolean;
}) {
  const groups = ["Roster", "Productoras"];
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Selecciona roster o productora…" /></SelectTrigger>
      <SelectContent>
        {items.length === 0 && <SelectItem value="__none" disabled>Sin roster ni productoras disponibles</SelectItem>}
        {groups.map((g) => {
          const sub = items.filter((i) => i.group === g);
          if (sub.length === 0) return null;
          return (
            <SelectGroup key={g}>
              <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{g}</SelectLabel>
              {sub.map((i) => (
                <SelectItem key={`${i.kind}:${i.id}`} value={`${i.kind}:${i.id}`}>{i.label}</SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function PersonSelect({ value, onChange, people, disabled }: {
  value: string; onChange: (v: string) => void;
  people: { id: string; full_name: string; email: string | null }[]; disabled?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
      <SelectContent>
        {people.length === 0 && <SelectItem value="__none" disabled>Sin personas con rol validador</SelectItem>}
        {people.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.full_name}{p.email ? ` · ${p.email}` : ""}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ImporteInput({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  // Permite dígitos, puntos (miles) y una coma decimal — formato es-ES.
  return (
    <Input
      inputMode="decimal"
      value={value}
      placeholder="0,00"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
      onBlur={() => {
        if (value === "") return;
        const n = Number(value.replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(n)) {
          onChange(new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n));
        }
      }}
    />
  );
}
