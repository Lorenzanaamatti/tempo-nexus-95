import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Link2, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

type Row = {
  id: string;
  composer_id: string;
  position: number;
  title: string | null;
  year: number | null;
  url: string | null;
  director: string | null;
  director_id: string | null;
  production_company: string | null;
  production_company_id: string | null;
  platform: string | null;
  platform_id: string | null;
  music_supervisor_person_id: string | null;
  production_id: string | null;
  spanish_film_id: string | null;
};

type Roster = { id: string; label: string };

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function FilmographyEditor({
  composerId,
  rows,
  onChange,
}: {
  composerId: string;
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  const [directors, setDirectors] = useState<Roster[]>([]);
  const [companies, setCompanies] = useState<Roster[]>([]);
  const [platforms, setPlatforms] = useState<Roster[]>([]);
  const [supervisors, setSupervisors] = useState<
    Array<{ id: string; label: string; person_id: string | null }>
  >([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, c, p, s, peopleAll] = await Promise.all([
        supabase.from("directors").select("id, full_name").order("full_name"),
        supabase.from("production_companies").select("id, name").order("name"),
        supabase.from("platforms").select("id, name").order("name"),
        supabase
          .from("composers")
          .select("id, full_name, artistic_name")
          .eq("roster_role", "supervisor")
          .order("full_name"),
        supabase.from("people").select("id, composer_id"),
      ]);
      setDirectors((d.data ?? []).map((r) => ({ id: r.id, label: r.full_name })));
      setCompanies((c.data ?? []).map((r) => ({ id: r.id, label: r.name })));
      setPlatforms((p.data ?? []).map((r) => ({ id: r.id, label: r.name })));
      const personByComposer = new Map<string, string>();
      for (const pp of peopleAll.data ?? []) {
        if (pp.composer_id) personByComposer.set(pp.composer_id, pp.id);
      }
      setSupervisors(
        (s.data ?? []).map((r: any) => ({
          id: r.id,
          label: r.artistic_name || r.full_name,
          person_id: personByComposer.get(r.id) ?? null,
        })),
      );
    })();
  }, []);

  async function add() {
    setBusy(true);
    const { data, error } = await supabase
      .from("composer_filmography")
      .insert({
        composer_id: composerId,
        position: (rows.at(-1)?.position ?? -1) + 1,
        title: "Nuevo título",
      })
      .select("*")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    onChange([...rows, data as Row]);
  }

  async function update(id: string, patch: Partial<Row>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from("composer_filmography").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta entrada?")) return;
    const prev = rows;
    onChange(rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("composer_filmography").delete().eq("id", id);
    if (error) {
      onChange(prev);
      toast.error(error.message);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Filmografía</h2>
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={busy}>
          + Añadir
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Cada Director, Productora, Plataforma y Supervisor se vinculan al CRM. Si no existen,
        usa "+ Crear nuevo" para añadirlos al instante.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin entradas.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-sm border border-border bg-card/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Título</Label>
                  <Input
                    defaultValue={r.title ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (r.title ?? "") &&
                      update(r.id, { title: e.target.value || null })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Año</Label>
                  <Input
                    type="number"
                    defaultValue={r.year ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      if (v !== r.year) update(r.id, { year: v });
                    }}
                  />
                </div>
                <CrmPicker
                  label="Dirección"
                  value={r.director_id}
                  fallback={r.director}
                  options={directors}
                  linkBase="/directors"
                  onPick={(opt) =>
                    update(r.id, {
                      director_id: opt?.id ?? null,
                      director: opt?.label ?? null,
                    })
                  }
                  onCreate={async (name) => {
                    const { data, error } = await supabase
                      .from("directors")
                      .insert({ full_name: name })
                      .select("id, full_name")
                      .single();
                    if (error) {
                      toast.error(error.message);
                      return null;
                    }
                    const opt = { id: data.id, label: data.full_name };
                    setDirectors((arr) => [...arr, opt].sort((a, b) => a.label.localeCompare(b.label)));
                    return opt;
                  }}
                />
                <CrmPicker
                  label="Productora"
                  value={r.production_company_id}
                  fallback={r.production_company}
                  options={companies}
                  linkBase="/production-companies"
                  routeParam="companyId"
                  onPick={(opt) =>
                    update(r.id, {
                      production_company_id: opt?.id ?? null,
                      production_company: opt?.label ?? null,
                    })
                  }
                  onCreate={async (name) => {
                    const { data, error } = await supabase
                      .from("production_companies")
                      .insert({ name })
                      .select("id, name")
                      .single();
                    if (error) {
                      toast.error(error.message);
                      return null;
                    }
                    const opt = { id: data.id, label: data.name };
                    setCompanies((arr) => [...arr, opt].sort((a, b) => a.label.localeCompare(b.label)));
                    return opt;
                  }}
                />
                <CrmPicker
                  label="Plataforma"
                  value={r.platform_id}
                  fallback={r.platform}
                  options={platforms}
                  linkBase="/platforms"
                  routeParam={null}
                  onPick={(opt) =>
                    update(r.id, {
                      platform_id: opt?.id ?? null,
                      platform: opt?.label ?? null,
                    })
                  }
                  onCreate={async (name) => {
                    const { data, error } = await supabase
                      .from("platforms")
                      .insert({ name })
                      .select("id, name")
                      .single();
                    if (error) {
                      toast.error(error.message);
                      return null;
                    }
                    const opt = { id: data.id, label: data.name };
                    setPlatforms((arr) => [...arr, opt].sort((a, b) => a.label.localeCompare(b.label)));
                    return opt;
                  }}
                />
                <CrmPicker
                  label="Supervisor musical"
                  value={
                    supervisors.find((s) => s.person_id === r.music_supervisor_person_id)?.id ??
                    null
                  }
                  fallback={null}
                  options={supervisors.map((s) => ({ id: s.id, label: s.label }))}
                  linkBase="/composers"
                  routeParam="composerId"
                  onPick={(opt) => {
                    const sup = opt ? supervisors.find((s) => s.id === opt.id) : null;
                    update(r.id, {
                      music_supervisor_person_id: sup?.person_id ?? null,
                    });
                  }}
                  onCreate={null}
                />
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">URL</Label>
                  <Input
                    type="url"
                    defaultValue={r.url ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (r.url ?? "") &&
                      update(r.id, { url: e.target.value || null })
                    }
                  />
                </div>
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

function CrmPicker({
  label,
  value,
  fallback,
  options,
  linkBase,
  routeParam = "directorId",
  onPick,
  onCreate,
}: {
  label: string;
  value: string | null;
  fallback: string | null;
  options: Roster[];
  linkBase: string;
  routeParam?: string | null;
  onPick: (opt: Roster | null) => void;
  onCreate: ((name: string) => Promise<Roster | null>) | null;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const picked = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = q
    ? options.filter((o) => normalize(o.label).includes(normalize(q))).slice(0, 8)
    : options.slice(0, 8);

  const exactExists = options.some((o) => normalize(o.label) === normalize(q));

  return (
    <div ref={ref} className="relative">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          value={open ? q : picked?.label ?? fallback ?? ""}
          placeholder="Buscar o crear…"
          onFocus={() => {
            setQ(picked?.label ?? fallback ?? "");
            setOpen(true);
          }}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          className="flex-1"
        />
        {picked && routeParam ? (
          <Link
            to={`${linkBase}/$${routeParam}` as any}
            params={{ [routeParam]: picked.id } as any}
            className="rounded-sm border border-border p-1.5 text-muted-foreground hover:text-foreground"
            title={`Abrir en ${linkBase}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px]">
        {picked ? (
          <span className="text-green-600">● Vinculado al CRM</span>
        ) : fallback ? (
          <span className="text-amber-600">○ Solo texto</span>
        ) : (
          <span className="text-muted-foreground">○ Sin asignar</span>
        )}
        {picked && (
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => {
              onPick(null);
              setQ("");
            }}
          >
            quitar vínculo
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-border bg-popover p-1 shadow-lg">
          {filtered.length === 0 && !q && (
            <div className="px-2 py-1 text-xs text-muted-foreground">Sin coincidencias.</div>
          )}
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              className="flex w-full items-center justify-between rounded-sm px-2 py-1 text-left text-sm hover:bg-muted"
              onClick={() => {
                onPick(o);
                setOpen(false);
              }}
            >
              <span>{o.label}</span>
              <Link2 className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
          {onCreate && q.trim() && !exactExists && (
            <button
              type="button"
              className="flex w-full items-center gap-1 rounded-sm border-t border-border px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={async () => {
                const opt = await onCreate(q.trim());
                if (opt) {
                  onPick(opt);
                  setOpen(false);
                  toast.success(`Creado: ${opt.label}`);
                }
              }}
            >
              + Crear "{q.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}