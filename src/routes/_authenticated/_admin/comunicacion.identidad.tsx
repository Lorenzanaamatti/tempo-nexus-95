import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { REDES_SOCIALES } from "@/lib/comunicacion-model";
import { useCurrentRole } from "@/lib/use-role";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/identidad")({
  component: IdentidadPage,
});

type Color = { nombre: string; hex: string };
type Red = { red: string; url: string };

function IdentidadPage() {
  const { isBigC } = useCurrentRole();
  const { data, refetch } = useQuery({
    queryKey: ["comunicacion-identidad"],
    queryFn: async () => {
      const { data, error } = await db.from("comunicacion_identidad").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });

  const [form, setForm] = useState({ tipografias: "", tono: "", guia_uso: "", bio_castellano: "", bio_catalan: "", bio_ingles: "" });
  const [paleta, setPaleta] = useState<Color[]>([]);
  const [redes, setRedes] = useState<Red[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      tipografias: data.tipografias ?? "",
      tono: data.tono ?? "",
      guia_uso: data.guia_uso ?? "",
      bio_castellano: data.bio_castellano ?? "",
      bio_catalan: data.bio_catalan ?? "",
      bio_ingles: data.bio_ingles ?? "",
    });
    setPaleta(Array.isArray(data.paleta) ? data.paleta : []);
    setRedes(Array.isArray(data.redes) ? data.redes : []);
  }, [data]);

  async function save() {
    setSaving(true);
    const payload = { ...form, paleta, redes };
    const { error } = data?.id
      ? await db.from("comunicacion_identidad").update(payload).eq("id", data.id)
      : await db.from("comunicacion_identidad").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Identidad guardada");
    refetch();
  }

  const ro = !isBigC;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Comunicación</p>
          <h1 className="mt-1 font-display text-5xl title-caps">Identidad corporativa</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Marca, tono, redes y biografías oficiales de Interesante Compañía.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/marketing/brand">Logotipos y archivos</Link></Button>
          {!ro && <Button onClick={save} disabled={saving}>Guardar</Button>}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-2xl title-caps">Paleta de colores</h2>
        <div className="space-y-2">
          {paleta.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-sm border border-border" style={{ background: c.hex || "transparent" }} />
              <Input disabled={ro} value={c.nombre} placeholder="Nombre" className="w-56" onChange={(e) => setPaleta(paleta.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
              <Input disabled={ro} value={c.hex} placeholder="#FF2D16" className="w-40 font-mono" onChange={(e) => setPaleta(paleta.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} />
              {!ro && <Button variant="ghost" size="icon" onClick={() => setPaleta(paleta.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
        </div>
        {!ro && (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setPaleta([...paleta, { nombre: "", hex: "" }])}>
            <Plus className="mr-1 h-4 w-4" /> Añadir color
          </Button>
        )}
      </section>

      <section className="mb-8 grid gap-4">
        <div className="grid gap-1.5">
          <Label>Tipografías</Label>
          <Input disabled={ro} value={form.tipografias} onChange={(e) => setForm({ ...form, tipografias: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label>Tono de comunicación</Label>
          <Textarea disabled={ro} rows={4} value={form.tono} onChange={(e) => setForm({ ...form, tono: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label>Guía de uso</Label>
          <Textarea disabled={ro} rows={6} value={form.guia_uso} onChange={(e) => setForm({ ...form, guia_uso: e.target.value })} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-2xl title-caps">Redes sociales activas</h2>
        <div className="space-y-2">
          {redes.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                disabled={ro}
                value={r.red}
                onChange={(e) => setRedes(redes.map((x, j) => j === i ? { ...x, red: e.target.value } : x))}
                className="h-9 rounded-sm border border-border bg-background px-2 text-sm"
              >
                <option value="">Selecciona…</option>
                {REDES_SOCIALES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <Input disabled={ro} value={r.url} placeholder="https://" className="flex-1" onChange={(e) => setRedes(redes.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
              {!ro && <Button variant="ghost" size="icon" onClick={() => setRedes(redes.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
        </div>
        {!ro && (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setRedes([...redes, { red: "", url: "" }])}>
            <Plus className="mr-1 h-4 w-4" /> Añadir red
          </Button>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-2xl title-caps">Bio oficial</h2>
        {([["bio_castellano", "Castellano"], ["bio_catalan", "Catalán"], ["bio_ingles", "Inglés"]] as const).map(([k, label]) => (
          <div key={k} className="grid gap-1.5">
            <Label>{label}</Label>
            <Textarea disabled={ro} rows={5} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </div>
        ))}
      </section>
    </div>
  );
}
