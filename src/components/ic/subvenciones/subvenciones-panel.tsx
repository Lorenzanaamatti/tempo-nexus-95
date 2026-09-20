import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  FolderOpen,
  Inbox,
  RefreshCw,
  Radar,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionDoors } from "@/components/section-doors";
import {
  ESTADOS_EXPEDIENTE,
  diasHasta,
  expedientesQuery,
  fechaCorta,
  fuentesQuery,
  oportunidadesQuery,
  type Expediente,
  type Fuente,
  type Oportunidad,
} from "@/lib/ic/subvenciones";
import { capturarAhora, puntuarAhora } from "@/lib/ic/subvenciones.functions";

// Las tablas subv_* no están en el cliente tipado.
const db = supabase as any;

type Puerta = "bandeja" | "fuentes" | "expedientes";

const PUERTAS: { id: Puerta; titulo: string; texto: string; icono: typeof Inbox }[] = [
  {
    id: "bandeja",
    titulo: "Bandeja",
    texto: "Convocatorias detectadas cada día, con nota de encaje. Se aceptan o se descartan.",
    icono: Inbox,
  },
  {
    id: "fuentes",
    titulo: "Fuentes",
    texto: "Las 110 fuentes vigiladas, su prioridad y si el último chequeo funcionó.",
    icono: Radar,
  },
  {
    id: "expedientes",
    titulo: "Expedientes",
    texto: "Subvenciones que se están preparando: plazos, importes, documentación y resultado.",
    icono: FolderOpen,
  },
];

export function SubvencionesPanel() {
  const [puerta, setPuerta] = useState<Puerta | null>(null);

  if (!puerta) {
    return (
      <SectionDoors
        doors={PUERTAS.map((p) => ({
          title: p.titulo,
          description: p.texto,
          icon: p.icono,
          onClick: () => setPuerta(p.id),
        }))}
      />
    );
  }

  return (
    <section className="space-y-6">
      <Button variant="outline" onClick={() => setPuerta(null)} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Atrás
      </Button>
      {puerta === "bandeja" && <Bandeja />}
      {puerta === "fuentes" && <Fuentes />}
      {puerta === "expedientes" && <Expedientes />}
    </section>
  );
}

/* ---------------------------------------------------------------- BANDEJA */

function Bandeja() {
  const qc = useQueryClient();
  const { data: oportunidades = [], isLoading } = useQuery(oportunidadesQuery);
  const [verDescartadas, setVerDescartadas] = useState(false);
  const puntuar = useServerFn(puntuarAhora);

  const lista = useMemo(
    () =>
      oportunidades.filter((o) =>
        verDescartadas ? o.estado === "descartada" : o.estado === "nueva",
      ),
    [oportunidades, verDescartadas],
  );

  const decidir = useMutation({
    mutationFn: async ({ o, estado }: { o: Oportunidad; estado: string }) => {
      const { error } = await db
        .from("subv_oportunidades")
        .update({ estado, decidido_at: new Date().toISOString() })
        .eq("id", o.id);
      if (error) throw error;
      if (estado === "aceptada") {
        const { error: e2 } = await db.from("subv_expedientes").insert({
          oportunidad_id: o.id,
          titulo: o.titulo,
          organismo: o.organismo,
          convocatoria_url: o.source_item_url,
          fecha_limite: o.fecha_limite,
          requisitos: o.excluyentes_ia,
        });
        if (e2) throw e2;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["subv_oportunidades"] });
      qc.invalidateQueries({ queryKey: ["subv_expedientes"] });
      toast.success(v.estado === "aceptada" ? "Expediente creado" : "Descartada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const analizar = useMutation({
    mutationFn: async () => await puntuar({ data: { limite: 20 } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["subv_oportunidades"] });
      toast.success(`${r.hechas} convocatorias analizadas`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo analizar"),
  });

  const sinAnalizar = oportunidades.filter((o) => o.estado === "nueva" && !o.analizada_ia).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">
          {verDescartadas ? "Descartadas" : "Convocatorias por revisar"} ({lista.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {sinAnalizar > 0 && (
            <Button onClick={() => analizar.mutate()} disabled={analizar.isPending}>
              {analizar.isPending ? "Analizando…" : `Analizar ${sinAnalizar} pendientes`}
            </Button>
          )}
          <Button variant="outline" onClick={() => setVerDescartadas((v) => !v)}>
            {verDescartadas ? "Ver pendientes" : "Ver descartadas"}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && lista.length === 0 && (
        <p className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          No hay convocatorias {verDescartadas ? "descartadas" : "pendientes de revisar"}.
        </p>
      )}

      <div className="space-y-3">
        {lista.map((o) => {
          const dias = diasHasta(o.fecha_limite);
          return (
            <article key={o.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {o.score_ia != null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          o.score_ia >= 70
                            ? "bg-primary text-primary-foreground"
                            : o.score_ia >= 40
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {o.score_ia}
                      </span>
                    )}
                    <h3 className="font-semibold text-aubergine">
                      {o.source_item_url ? (
                        <a
                          href={o.source_item_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-4 hover:underline"
                        >
                          {o.titulo}
                        </a>
                      ) : (
                        o.titulo
                      )}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[o.organismo, o.territorio, o.tipo_oportunidad].filter(Boolean).join(" · ")}
                    {o.fecha_limite &&
                      ` · Cierra ${fechaCorta(o.fecha_limite)}${dias != null ? ` (${dias} días)` : ""}`}
                  </p>
                  {o.motivo_ia && <p className="mt-2 text-sm">{o.motivo_ia}</p>}
                  {o.excluyentes_ia && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requisitos a comprobar: {o.excluyentes_ia}
                    </p>
                  )}
                </div>
                {!verDescartadas && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => decidir.mutate({ o, estado: "aceptada" })}
                      className="gap-1"
                    >
                      <Check className="h-4 w-4" /> Preparar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decidir.mutate({ o, estado: "descartada" })}
                      className="gap-1"
                    >
                      <X className="h-4 w-4" /> Descartar
                    </Button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- FUENTES */

function Fuentes() {
  const qc = useQueryClient();
  const { data: fuentes = [], isLoading } = useQuery(fuentesQuery);
  const [prioridad, setPrioridad] = useState<string>("P1");
  const capturar = useServerFn(capturarAhora);

  const lista = useMemo(
    () => fuentes.filter((f) => prioridad === "todas" || f.prioridad === prioridad),
    [fuentes, prioridad],
  );

  const revisar = useMutation({
    mutationFn: async (modo: "api" | "web") => await capturar({ data: { modo } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["subv_fuentes"] });
      qc.invalidateQueries({ queryKey: ["subv_oportunidades"] });
      toast.success(`${r.nuevas} convocatorias nuevas · ${r.puntuadas} analizadas`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo revisar"),
  });

  const activar = useMutation({
    mutationFn: async (f: Fuente) => {
      const { error } = await db
        .from("subv_fuentes")
        .update({ activa: !f.activa })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subv_fuentes"] }),
    onError: () => toast.error("No se pudo cambiar la fuente"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">Fuentes vigiladas ({lista.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={prioridad} onValueChange={setPrioridad}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P1">Prioridad 1</SelectItem>
              <SelectItem value="P2">Prioridad 2</SelectItem>
              <SelectItem value="P3">Prioridad 3</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => revisar.mutate("api")}
            disabled={revisar.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${revisar.isPending ? "animate-spin" : ""}`} />
            Revisar ahora
          </Button>
          <Button
            variant="outline"
            onClick={() => revisar.mutate("web")}
            disabled={revisar.isPending}
          >
            Vigilar webs
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Fuente</th>
              <th className="px-3 py-2">Territorio</th>
              <th className="px-3 py-2">Conexión</th>
              <th className="px-3 py-2">Último chequeo</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Vigilada</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  {f.url_portal ? (
                    <a
                      href={f.url_portal}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-aubergine underline-offset-4 hover:underline"
                    >
                      {f.nombre}
                    </a>
                  ) : (
                    <span className="font-medium">{f.nombre}</span>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {f.prioridad} · {f.categoria}
                  </p>
                </td>
                <td className="px-3 py-2 text-xs">{f.territorio}</td>
                <td className="px-3 py-2 text-xs">
                  {f.metodo_conexion}
                  <span className="ml-1 text-muted-foreground">({f.nivel_automatizacion})</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {f.last_checked_at
                    ? new Date(f.last_checked_at).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Nunca"}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span
                    className={
                      f.health_status === "OK" ? "text-muted-foreground" : "font-semibold text-primary"
                    }
                  >
                    {f.health_status}
                  </span>
                  {f.last_error && (
                    <p className="max-w-xs text-[11px] text-muted-foreground">{f.last_error}</p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Button size="sm" variant={f.activa ? "default" : "outline"} onClick={() => activar.mutate(f)}>
                    {f.activa ? "Sí" : "No"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ EXPEDIENTES */

function Expedientes() {
  const qc = useQueryClient();
  const { data: expedientes = [], isLoading } = useQuery(expedientesQuery);
  const [abierto, setAbierto] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: async () => {
      const { data, error } = await db
        .from("subv_expedientes")
        .insert({ titulo: "Nueva subvención" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["subv_expedientes"] });
      setAbierto(id);
    },
    onError: () => toast.error("No se pudo crear el expediente"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">Expedientes ({expedientes.length})</h2>
        <Button onClick={() => crear.mutate()}>Nuevo expediente</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && expedientes.length === 0 && (
        <p className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          Todavía no hay expedientes. Se crean al aceptar una convocatoria en la bandeja.
        </p>
      )}

      <div className="space-y-3">
        {expedientes.map((e) => (
          <FichaExpediente
            key={e.id}
            expediente={e}
            abierto={abierto === e.id}
            alAbrir={() => setAbierto(abierto === e.id ? null : e.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FichaExpediente({
  expediente,
  abierto,
  alAbrir,
}: {
  expediente: Expediente;
  abierto: boolean;
  alAbrir: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(expediente);
  const dias = diasHasta(expediente.fecha_limite);

  const guardar = useMutation({
    mutationFn: async () => {
      const { id, ...resto } = form;
      const { error } = await db.from("subv_expedientes").update(resto).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subv_expedientes"] });
      toast.success("Expediente guardado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const borrar = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("subv_expedientes").delete().eq("id", expediente.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subv_expedientes"] });
      toast.success("Expediente eliminado");
    },
  });

  const campo = (k: keyof Expediente, v: string | number | null) =>
    setForm((f) => ({ ...f, [k]: v }) as Expediente);

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <button type="button" onClick={alAbrir} className="w-full text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-aubergine">{expediente.titulo}</span>
          <span className="text-xs text-muted-foreground">
            {expediente.estado} · {fechaCorta(expediente.fecha_limite)}
            {dias != null && dias >= 0 ? ` (${dias} días)` : ""}
          </span>
        </div>
      </button>

      {abierto && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.titulo} onChange={(e) => campo("titulo", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Organismo</Label>
            <Input
              value={form.organismo ?? ""}
              onChange={(e) => campo("organismo", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Enlace a la convocatoria</Label>
            <Input
              value={form.convocatoria_url ?? ""}
              onChange={(e) => campo("convocatoria_url", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => campo("estado", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_EXPEDIENTE.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Importe solicitado (€)</Label>
            <Input
              type="number"
              value={form.importe_solicitado ?? ""}
              onChange={(e) =>
                campo("importe_solicitado", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Importe concedido (€)</Label>
            <Input
              type="number"
              value={form.importe_concedido ?? ""}
              onChange={(e) =>
                campo("importe_concedido", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha límite</Label>
            <Input
              type="date"
              value={form.fecha_limite ?? ""}
              onChange={(e) => campo("fecha_limite", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha de presentación</Label>
            <Input
              type="date"
              value={form.fecha_presentacion ?? ""}
              onChange={(e) => campo("fecha_presentacion", e.target.value || null)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Requisitos</Label>
            <Textarea
              rows={2}
              value={form.requisitos ?? ""}
              onChange={(e) => campo("requisitos", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Documentación pendiente</Label>
            <Textarea
              rows={2}
              value={form.documentacion_pendiente ?? ""}
              onChange={(e) => campo("documentacion_pendiente", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notas</Label>
            <Textarea
              rows={3}
              value={form.notas ?? ""}
              onChange={(e) => campo("notas", e.target.value)}
            />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              Guardar
            </Button>
            <Button variant="outline" onClick={() => borrar.mutate()}>
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
