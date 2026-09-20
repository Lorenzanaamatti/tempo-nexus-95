import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Las tablas subv_* son propias de esta sección; el cliente tipado no las conoce.
const db = supabase as any;

export interface Fuente {
  id: string;
  source_id: string;
  prioridad: string | null;
  categoria: string | null;
  subcategoria: string | null;
  nombre: string;
  naturaleza: string | null;
  territorio: string | null;
  cobertura: string | null;
  tipos_oportunidad: string | null;
  beneficiarios: string | null;
  relev_empresa: string | null;
  relev_cultura: string | null;
  relev_mujeres: string | null;
  relev_tech: string | null;
  dinero_directo: string | null;
  que_aporta: string | null;
  limitaciones: string | null;
  metodo_conexion: string | null;
  nivel_automatizacion: string | null;
  frecuencia: string | null;
  url_portal: string | null;
  url_tecnica: string | null;
  notas_tecnicas: string | null;
  verificacion: string | null;
  conector: string | null;
  activa: boolean;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_change_at: string | null;
  health_status: string;
  last_error: string | null;
}

export interface Oportunidad {
  id: string;
  fuente_id: string | null;
  source_id: string | null;
  titulo: string;
  organismo: string | null;
  descripcion: string | null;
  territorio: string | null;
  sector: string | null;
  destinatarios: string | null;
  tipo_oportunidad: string | null;
  importe: number | null;
  fecha_publicacion: string | null;
  fecha_limite: string | null;
  source_item_url: string | null;
  bdns: string | null;
  score_ia: number | null;
  motivo_ia: string | null;
  excluyentes_ia: string | null;
  analizada_ia: boolean;
  estado: string;
  notas: string | null;
  detectada_at: string;
}

export interface Expediente {
  id: string;
  oportunidad_id: string | null;
  titulo: string;
  organismo: string | null;
  convocatoria_url: string | null;
  importe_solicitado: number | null;
  importe_concedido: number | null;
  fecha_limite: string | null;
  fecha_presentacion: string | null;
  fecha_resolucion: string | null;
  estado: string;
  responsable_id: string | null;
  requisitos: string | null;
  documentacion_pendiente: string | null;
  notas: string | null;
}

export interface Programa {
  id: string;
  source_id: string | null;
  nombre: string;
  area: string | null;
  tipo_apoyo: string | null;
  beneficiarios: string | null;
  recurrencia: string | null;
  por_que_importa: string | null;
  url: string | null;
}

export const ESTADOS_EXPEDIENTE = [
  "preparando",
  "presentado",
  "subsanación",
  "concedido",
  "denegado",
  "desistido",
] as const;

export const fuentesQuery = queryOptions({
  queryKey: ["subv_fuentes"],
  queryFn: async (): Promise<Fuente[]> => {
    const { data, error } = await db
      .from("subv_fuentes")
      .select("*")
      .order("prioridad", { ascending: true })
      .order("nombre", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Fuente[];
  },
});

export const programasQuery = queryOptions({
  queryKey: ["subv_programas"],
  queryFn: async (): Promise<Programa[]> => {
    const { data, error } = await db
      .from("subv_programas")
      .select("*")
      .order("nombre");
    if (error) throw error;
    return (data ?? []) as Programa[];
  },
});

export const oportunidadesQuery = queryOptions({
  queryKey: ["subv_oportunidades"],
  queryFn: async (): Promise<Oportunidad[]> => {
    const { data, error } = await db
      .from("subv_oportunidades")
      .select("*")
      .order("score_ia", { ascending: false, nullsFirst: false })
      .order("detectada_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as Oportunidad[];
  },
});

export const expedientesQuery = queryOptions({
  queryKey: ["subv_expedientes"],
  queryFn: async (): Promise<Expediente[]> => {
    const { data, error } = await db
      .from("subv_expedientes")
      .select("*")
      .order("fecha_limite", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as Expediente[];
  },
});

export function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const d = new Date(`${fecha}T00:00:00`);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
}

export function fechaCorta(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
