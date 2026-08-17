import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { toast } from "sonner";
import { Plus, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateEs } from "@/lib/dates";
import {
  PARTNER_CATEGORIES,
  PARTNER_CATEGORY_LABEL,
  PARTNER_CATEGORY_TONE,
  partnerKey,
  type PartnerCategory,
  type PartnerRow,
} from "@/lib/partner-categories";

export const Route = createFileRoute("/_authenticated/_admin/partners/")({
  component: PartnersIndex,
});

async function fetchPartners(): Promise<PartnerRow[]> {
  const [companies, platforms, directors, providers] = await Promise.all([
    supabase.from("production_companies").select("id, name, city, country, contact_name, updated_at"),
    supabase.from("platforms").select("id, name, country, contact_name, updated_at"),
    supabase.from("directors").select("id, full_name, country, agent, updated_at"),
    supabase.from("providers").select("id, name, kind, city, country, contact_name, updated_at"),
  ]);
  for (const r of [companies, platforms, directors, providers]) if (r.error) throw r.error;

  const rows: PartnerRow[] = [
    ...((companies.data ?? []) as any[]).map((c) => ({
      key: partnerKey("productora", c.id), id: c.id, category: "productora" as PartnerCategory,
      name: c.name, city: c.city ?? null, country: c.country ?? null, contact: c.contact_name ?? null, updatedAt: c.updated_at ?? null,
    })),
    ...((platforms.data ?? []) as any[]).map((p) => ({
      key: partnerKey("plataforma", p.id), id: p.id, category: "plataforma" as PartnerCategory,
      name: p.name, city: null, country: p.country ?? null, contact: p.contact_name ?? null, updatedAt: p.updated_at ?? null,
    })),
    ...((directors.data ?? []) as any[]).map((d) => ({
      key: partnerKey("director", d.id), id: d.id, category: "director" as PartnerCategory,
      name: d.full_name, city: null, country: d.country ?? null, contact: d.agent ?? null, updatedAt: d.updated_at ?? null,
    })),
    ...((providers.data ?? []) as any[]).map((p) => ({
      key: partnerKey(p.kind === "otros" ? "otro" : "proveedor", p.id), id: p.id,
      category: (p.kind === "otros" ? "otro" : "proveedor") as PartnerCategory,
      name: p.name, city: p.city ?? null, country: p.country ?? null, contact: p.contact_name ?? null, updatedAt: p.updated_at ?? null,
    })),
  ];
  return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function PartnersIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<PartnerCategory[]>([]);
  const [open, setOpen] = useState(false);

  const partnersQ = useQuery({ queryKey: ["partners-aggregated"], queryFn: fetchPartners });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (partnersQ.data ?? [])
      .filter((r) => !cats.length || cats.includes(r.category))
      .filter((r) => !needle || r.name.toLowerCase().includes(needle));
  }, [partnersQ.data, q, cats]);

  function toggleCat(c: PartnerCategory) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Partners</p>
          <h1 className="mt-1 font-display text-5xl title-caps">PARTNERS</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Productoras, plataformas, directores, proveedores y otros contactos estratégicos en una única lista.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar partner…" className="w-56 rounded-sm" />
          <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Añadir partner</Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {PARTNER_CATEGORIES.map((c) => {
          const active = cats.includes(c);
          const count = (partnersQ.data ?? []).filter((r) => r.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCat(c)}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-xs smallcaps transition",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
              )}
            >
              {PARTNER_CATEGORY_LABEL[c]}s <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
        {cats.length > 0 && (
          <button type="button" onClick={() => setCats([])} className="px-2 text-xs smallcaps text-muted-foreground hover:underline">
            Limpiar
          </button>
        )}
      </div>

      {partnersQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        q || cats.length ? (
          <EmptyState variant="filtered" title="Ningún resultado" description="Ningún partner coincide con los filtros actuales." action={{ label: "Limpiar filtros", onClick: () => { setQ(""); setCats([]); } }} />
        ) : (
          <EmptyState icon={Handshake} title="Sin partners" description="Añade la primera productora, plataforma, director o proveedor." />
        )
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 smallcaps text-xs">Nombre</th>
                <th className="px-3 py-2 smallcaps text-xs">Categoría</th>
                <th className="px-3 py-2 smallcaps text-xs">Ubicación</th>
                <th className="px-3 py-2 smallcaps text-xs">Contacto</th>
                <th className="px-3 py-2 smallcaps text-xs">Última actualización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link to="/partners/$partnerId" params={{ partnerId: r.key }} className="font-display hover:underline">{r.name}</Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${PARTNER_CATEGORY_TONE[r.category]}`}>
                      {PARTNER_CATEGORY_LABEL[r.category]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{[r.city, r.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.contact || "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewPartnerDialog open={open} onOpenChange={setOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["partners-aggregated"] })} />
    </div>
  );
}

function NewPartnerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PartnerCategory>("productora");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const extraNotes = [notes.trim() || null, category === "plataforma" || category === "director" ? (city.trim() ? `Ciudad: ${city.trim()}` : null) : null]
      .filter(Boolean).join("\n") || null;
    let error: { message: string } | null = null;
    if (category === "productora") {
      ({ error } = await supabase.from("production_companies").insert({ name: name.trim(), country: country.trim() || null, city: city.trim() || null, notes: extraNotes }));
    } else if (category === "plataforma") {
      ({ error } = await supabase.from("platforms").insert({ name: name.trim(), country: country.trim() || null, notes: extraNotes }));
    } else if (category === "director") {
      ({ error } = await supabase.from("directors").insert({ full_name: name.trim(), country: country.trim() || null, notes: extraNotes }));
    } else {
      ({ error } = await (supabase as any).from("providers").insert({
        name: name.trim(), kind: "otros", country: country.trim() || null, city: city.trim() || null, notes: extraNotes,
      }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Partner creado");
    setName(""); setCountry(""); setCity(""); setNotes("");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo partner</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del partner" />
          </div>
          <div className="grid gap-1.5">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as PartnerCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PARTNER_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{PARTNER_CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>País</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Ciudad</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>Crear partner</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
