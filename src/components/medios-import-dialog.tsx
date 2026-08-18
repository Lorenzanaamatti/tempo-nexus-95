import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Globe, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchMedios, importMedios } from "@/lib/medios-import.functions";
import {
  MEDIO_AMBITOS,
  MEDIO_ESPECIALIDADES,
  MEDIO_FORMATOS,
  type MedioAmbito,
  type MedioEspecialidad,
  type MedioFormato,
} from "@/lib/medios-model";

type Candidato = {
  fuente_externa_id: string;
  nombre: string;
  formato: MedioFormato;
  especialidad: MedioEspecialidad;
  ambito: "Nacional" | "Internacional";
  pais: string;
  ciudad: string | null;
  website: string;
  descripcion: string | null;
  verificado: boolean;
  existe: boolean;
};

const CSV_EJEMPLO =
  "nombre,website,ciudad,email,contacto,subtipo\nRevista Ejemplo,https://ejemplo.com,Madrid,redaccion@ejemplo.com,Ana Pérez,Medio digital";

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
  return lines
    .slice(1)
    .map(split)
    .map((c) => ({
      nombre: iN >= 0 ? c[iN] : c[0],
      website: iW >= 0 ? c[iW] || null : null,
      ciudad: iC >= 0 ? c[iC] || null : null,
      contacto_email: iE >= 0 ? c[iE] || null : null,
      contacto_principal: iP >= 0 ? c[iP] || null : null,
      subtipo: iS >= 0 ? c[iS] || null : null,
      pais: "España",
    }))
    .filter((r) => r.nombre);
}

export function MediosImportDialog() {
  const qc = useQueryClient();
  const search = useServerFn(searchMedios);
  const doImport = useServerFn(importMedios);

  const [open, setOpen] = useState(false);
  const [ambito, setAmbito] = useState<MedioAmbito>("España");
  const [especialidades, setEspecialidades] = useState<MedioEspecialidad[]>([...MEDIO_ESPECIALIDADES]);
  const [formatos, setFormatos] = useState<MedioFormato[]>([...MEDIO_FORMATOS]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<Candidato[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [csv, setCsv] = useState("");

  const selectedItems = useMemo(
    () => results.filter((r) => selected[r.fuente_externa_id]),
    [results, selected],
  );

  async function runSearch() {
    if (!especialidades.length) return toast.error("Selecciona al menos una especialidad");
    if (!formatos.length) return toast.error("Selecciona al menos un formato");
    setLoading(true);
    try {
      const res = await search({ data: { ambito, especialidades, formatos, limit: 60 } });
      const rows = res.results as Candidato[];
      setResults(rows);
      const preset: Record<string, boolean> = {};
      for (const r of rows) preset[r.fuente_externa_id] = !r.existe && r.verificado;
      setSelected(preset);
      toast.success(`${res.total} medios encontrados`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo completar la búsqueda");
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
            subtipo: r.formato,
            ciudad: r.ciudad,
            pais: r.pais,
            website: r.website,
            notas: [r.descripcion, `Especialidad: ${r.especialidad}`].filter(Boolean).join(" · "),
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
        <Globe className="mr-2 h-4 w-4" /> Buscar medios
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>BUSCAR MEDIOS</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="web">
            <TabsList>
              <TabsTrigger value="web">Buscar en la web</TabsTrigger>
              <TabsTrigger value="csv">CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="web" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div>
                  <Label>Ámbito</Label>
                  <Select value={ambito} onValueChange={(v) => setAmbito(v as MedioAmbito)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIO_AMBITOS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Especialidad</Label>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {MEDIO_ESPECIALIDADES.map((e) => (
                        <label key={e} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={especialidades.includes(e)}
                            onCheckedChange={() =>
                              setEspecialidades((prev) =>
                                prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
                              )
                            }
                          />
                          {e}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Formato</Label>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {MEDIO_FORMATOS.map((f) => (
                        <label key={f} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={formatos.includes(f)}
                            onCheckedChange={() =>
                              setFormatos((prev) =>
                                prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
                              )
                            }
                          />
                          {f}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={runSearch} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar
              </Button>

              {results.length > 0 && (
                <>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setSelected(
                          Object.fromEntries(
                            results.filter((r) => r.verificado).map((r) => [r.fuente_externa_id, true]),
                          ),
                        )
                      }
                    >
                      Seleccionar verificados
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
                      Ninguno
                    </Button>
                    <span>
                      {selectedItems.length} seleccionados de {results.length}
                    </span>
                  </div>

                  <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/60 text-left">
                        <tr>
                          <th className="w-10 p-2" />
                          <th className="p-2">Nombre</th>
                          <th className="p-2">Formato</th>
                          <th className="p-2">Especialidad</th>
                          <th className="p-2">Ámbito</th>
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
                            <td className="p-2 font-medium">
                              {r.nombre}
                              {r.descripcion && (
                                <span className="block text-xs font-normal text-muted-foreground">
                                  {r.descripcion}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-muted-foreground">{r.formato}</td>
                            <td className="p-2 text-muted-foreground">{r.especialidad}</td>
                            <td className="p-2 text-muted-foreground">
                              {r.ambito === "Nacional" ? r.pais : `${r.pais}`}
                            </td>
                            <td className="p-2 max-w-[200px] truncate text-muted-foreground">
                              <a href={r.website} target="_blank" rel="noreferrer" className="hover:underline">
                                {r.website.replace(/^https?:\/\//, "")}
                              </a>
                            </td>
                            <td className="p-2">
                              {r.existe ? (
                                <Badge variant="secondary">Ya existe</Badge>
                              ) : r.verificado ? (
                                <Badge>Nuevo</Badge>
                              ) : (
                                <Badge variant="outline">No verificado</Badge>
                              )}
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
