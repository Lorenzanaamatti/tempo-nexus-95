import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchWikidataMedios, importMedios } from "@/lib/medios-import.functions";
import { MEDIO_TIPOS, type MedioTipo } from "@/lib/medios-import.server";

type Candidato = {
  fuente_externa_id: string;
  nombre: string;
  subtipo: string;
  ciudad: string | null;
  pais: string;
  website: string | null;
  existe: boolean;
};

const CSV_EJEMPLO = "nombre,website,ciudad,email,contacto,subtipo\nRevista Ejemplo,https://ejemplo.com,Madrid,redaccion@ejemplo.com,Ana Pérez,Medio digital";

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const split = (l: string) => l.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const idx = (names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)));
  const iN = idx(["nombre", "medio", "name"]);
  const iW = idx(["web", "url", "site"]);
  const iC = idx(["ciudad", "city"]);
  const iE = idx(["email", "correo", "mail"]);
  const iP = idx(["contacto", "persona"]);
  const iS = idx(["subtipo", "tipo"]);
  return lines.slice(1).map(split).map((c) => ({
    nombre: iN >= 0 ? c[iN] : c[0],
    website: iW >= 0 ? c[iW] || null : null,
    ciudad: iC >= 0 ? c[iC] || null : null,
    contacto_email: iE >= 0 ? c[iE] || null : null,
    contacto_principal: iP >= 0 ? c[iP] || null : null,
    subtipo: iS >= 0 ? c[iS] || null : null,
    pais: "España",
  })).filter((r) => r.nombre);
}

export function MediosImportDialog() {
  const qc = useQueryClient();
  const search = useServerFn(searchWikidataMedios);
  const doImport = useServerFn(importMedios);

  const [open, setOpen] = useState(false);
  const [pais, setPais] = useState("España");
  const [tipos, setTipos] = useState<MedioTipo[]>([...MEDIO_TIPOS]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<Candidato[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [csv, setCsv] = useState("");

  const selectedItems = useMemo(() => results.filter((r) => selected[r.fuente_externa_id]), [results, selected]);

  function toggleTipo(t: MedioTipo) {
    setTipos((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function runSearch() {
    if (!tipos.length) return toast.error("Selecciona al menos un tipo de medio");
    setLoading(true);
    try {
      const res = await search({ data: { pais, tipos, limit: 400 } });
      setResults(res.results as Candidato[]);
      const preset: Record<string, boolean> = {};
      for (const r of res.results as Candidato[]) preset[r.fuente_externa_id] = !r.existe;
      setSelected(preset);
      toast.success(`${res.total} medios encontrados`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo consultar Wikidata");
    } finally {
      setLoading(false);
    }
  }

  async function importSelected() {
    if (!selectedItems.length) return toast.error("No hay medios seleccionados");
    setSaving(true);
    try {
      const res = await doImport({
        data: {
          items: selectedItems.map((r) => ({
            nombre: r.nombre,
            subtipo: r.subtipo,
            ciudad: r.ciudad,
            pais: r.pais,
            website: r.website,
            fuente_externa_id: r.fuente_externa_id,
          })),
        },
      });
      toast.success(`${res.creados} creados · ${res.actualizados} actualizados`);
      qc.invalidateQueries({ queryKey: ["partners"] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo importar");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv() {
    const items = parseCsv(csv);
    if (!items.length) return toast.error("El CSV no tiene filas válidas");
    setSaving(true);
    try {
      const res = await doImport({ data: { items } });
      toast.success(`${res.creados} creados · ${res.actualizados} actualizados`);
      qc.invalidateQueries({ queryKey: ["partners"] });
      setCsv("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo importar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Download className="mr-2 h-4 w-4" /> Importar medios
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>IMPORTAR MEDIOS</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="wikidata">
            <TabsList>
              <TabsTrigger value="wikidata">Wikidata</TabsTrigger>
              <TabsTrigger value="csv">CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="wikidata" className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-48">
                  <Label>País</Label>
                  <Input value={pais} onChange={(e) => setPais(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-3">
                  {MEDIO_TIPOS.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={tipos.includes(t)} onCheckedChange={() => toggleTipo(t)} />
                      {t}
                    </label>
                  ))}
                </div>
                <Button onClick={runSearch} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Buscar
                </Button>
              </div>

              {results.length > 0 && (
                <>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setSelected(Object.fromEntries(results.map((r) => [r.fuente_externa_id, true])))
                      }
                    >
                      Seleccionar todos
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
                      Ninguno
                    </Button>
                    <span>{selectedItems.length} seleccionados de {results.length}</span>
                  </div>

                  <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/60 text-left">
                        <tr>
                          <th className="w-10 p-2" />
                          <th className="p-2">Nombre</th>
                          <th className="p-2">Tipo</th>
                          <th className="p-2">Ciudad</th>
                          <th className="p-2">Web</th>
                          <th className="p-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.fuente_externa_id} className="border-t border-border">
                            <td className="p-2">
                              <Checkbox
                                checked={!!selected[r.fuente_externa_id]}
                                onCheckedChange={(v) =>
                                  setSelected((s) => ({ ...s, [r.fuente_externa_id]: !!v }))
                                }
                              />
                            </td>
                            <td className="p-2 font-medium">{r.nombre}</td>
                            <td className="p-2 text-muted-foreground">{r.subtipo}</td>
                            <td className="p-2 text-muted-foreground">{r.ciudad ?? "—"}</td>
                            <td className="p-2 max-w-[220px] truncate text-muted-foreground">
                              {r.website ? (
                                <a href={r.website} target="_blank" rel="noreferrer" className="hover:underline">
                                  {r.website}
                                </a>
                              ) : "—"}
                            </td>
                            <td className="p-2">
                              {r.existe ? <Badge variant="secondary">Ya existe</Badge> : <Badge>Nuevo</Badge>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <DialogFooter>
                    <Button onClick={importSelected} disabled={saving || !selectedItems.length}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Importar seleccionados
                    </Button>
                  </DialogFooter>
                </>
              )}
            </TabsContent>

            <TabsContent value="csv" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pega un CSV con cabecera: nombre, website, ciudad, email, contacto, subtipo.
              </p>
              <Textarea
                rows={10}
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                placeholder={CSV_EJEMPLO}
                className="font-mono text-xs"
              />
              <DialogFooter>
                <Button onClick={importCsv} disabled={saving || !csv.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar CSV
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
