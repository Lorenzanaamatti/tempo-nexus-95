import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CrmAddMenu, type CrmAction } from "./crm-add-menu";
import { normalizeName } from "@/lib/spanish-films-crm";

export type EntityItem = { name: string; id: string | null };

export function EntityListEditor({
  title,
  items,
  onChange,
  roster,
  placeholder,
  crmActionsFor,
}: {
  title: string;
  items: EntityItem[];
  onChange: (next: EntityItem[]) => void;
  roster: Array<{ id: string; label: string }>;
  placeholder: string;
  crmActionsFor?: (item: EntityItem, setId: (id: string | null) => void) => CrmAction[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, { name: "", id: null }])}
        >
          + Añadir
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin entradas.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const n = normalizeName(it.name);
            const suggestions =
              !it.id && n ? roster.filter((r) => normalizeName(r.label).includes(n)).slice(0, 4) : [];
            return (
              <li key={idx} className="rounded-sm border border-border p-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={it.name}
                    placeholder={placeholder}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { name: e.target.value, id: null };
                      onChange(next);
                    }}
                    className="flex-1"
                  />
                  <Select
                    value={it.id ?? "none"}
                    onValueChange={(v) => {
                      const next = [...items];
                      if (v === "none") {
                        next[idx] = { ...next[idx], id: null };
                      } else {
                        const picked = roster.find((r) => r.id === v);
                        next[idx] = { name: picked?.label ?? next[idx].name, id: v };
                      }
                      onChange(next);
                    }}
                  >
                    <SelectTrigger className="w-56 rounded-sm">
                      <SelectValue placeholder="Vincular CRM…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sin vincular —</SelectItem>
                      {roster.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </Button>
                  {crmActionsFor && it.name.trim() && (
                    <CrmAddMenu
                      actions={crmActionsFor(it, (id) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], id };
                        onChange(next);
                      })}
                    />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {it.id ? (
                    <span className="text-green-600">● Vinculado al CRM</span>
                  ) : (
                    <span className="text-muted-foreground">○ Sin vincular</span>
                  )}
                  {suggestions.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="rounded-sm border border-dashed border-border px-1.5 py-0.5 hover:bg-muted"
                          onClick={() => {
                            const next = [...items];
                            next[idx] = { name: s.label, id: s.id };
                            onChange(next);
                          }}
                        >
                          ↳ {s.label}
                        </button>
                      ))}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
