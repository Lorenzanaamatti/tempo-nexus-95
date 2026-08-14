export function FamilyChip({
  active,
  onClick,
  children,
  dotClass,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dotClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1 text-xs transition ${
        active ? "border-foreground bg-foreground/[0.04]" : "border-border opacity-50 hover:opacity-90"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${dotClass} ${active ? "" : "opacity-40"}`} />
      {children}
    </button>
  );
}

export function SubjectFilters({
  people,
  composers,
  hidden,
  onToggle,
  onSetAll,
}: {
  people: Array<{ id: string; full_name: string; role: string | null; composer_id: string | null }>;
  composers: Array<{ id: string; full_name: string }>;
  hidden: Set<string>;
  onToggle: (key: string) => void;
  onSetAll: (keys: string[], visible: boolean) => void;
}) {
  // Team = people NOT linked to a composer. Roster = composers (deduped).
  const team = people.filter((p) => !p.composer_id).sort((a, b) => a.full_name.localeCompare(b.full_name));
  const roster = [...composers].sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <div className="mb-4 space-y-2">
      <SubjectRow
        title="Equipo"
        keys={team.map((p) => `person::${p.id}`)}
        items={team.map((p) => ({ key: `person::${p.id}`, label: p.full_name }))}
        hidden={hidden}
        onToggle={onToggle}
        onSetAll={onSetAll}
        dotClass="bg-emerald-500"
      />
      <SubjectRow
        title="Roster"
        keys={roster.map((c) => `composer::${c.id}`)}
        items={roster.map((c) => ({ key: `composer::${c.id}`, label: c.full_name }))}
        hidden={hidden}
        onToggle={onToggle}
        onSetAll={onSetAll}
        dotClass="bg-teal-500"
      />
    </div>
  );
}

function SubjectRow({
  title,
  keys,
  items,
  hidden,
  onToggle,
  onSetAll,
  dotClass,
}: {
  title: string;
  keys: string[];
  items: Array<{ key: string; label: string }>;
  hidden: Set<string>;
  onToggle: (key: string) => void;
  onSetAll: (keys: string[], visible: boolean) => void;
  dotClass: string;
}) {
  if (items.length === 0) return null;
  const allHidden = keys.every((k) => hidden.has(k));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="smallcaps mr-1 text-[10px] text-muted-foreground">{title}</span>
      <button
        type="button"
        onClick={() => onSetAll(keys, allHidden)}
        className="rounded-sm border border-border px-2 py-0.5 text-[10px] opacity-70 hover:opacity-100"
      >
        {allHidden ? "Mostrar todos" : "Ocultar todos"}
      </button>
      {items.map((it) => {
        const active = !hidden.has(it.key);
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onToggle(it.key)}
            className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] transition ${
              active ? "border-foreground bg-foreground/[0.04]" : "border-border opacity-40 hover:opacity-80"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass} ${active ? "" : "opacity-40"}`} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
