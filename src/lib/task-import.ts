import { z } from "zod";

/** Emails autorizados a importar tareas (comparación sin mayúsculas). */
export const TASK_IMPORT_EMAILS = [
  "claudia@juny.tv",
  "claudia@fronterah.com",
  "louplusmusic@gmail.com",
  "lourdes@plus-music.com",
];

export function canImportTasks(email: string | null | undefined) {
  return !!email && TASK_IMPORT_EMAILS.includes(email.trim().toLowerCase());
}

const str = z.string().trim().max(2000).nullish();
export const taskImportRowSchema = z.object({
  n: z.union([z.number(), z.string()]).nullish(),
  persona: str,
  cliente: str,
  asunto: str,
  tarea: z.string().trim().max(2000).nullish(),
  fecha: z.string().trim().max(40).nullish(),
  fecha_texto: str,
  categoria: str,
  urgencia: z.union([z.number(), z.string()]).nullish(),
  origen: str,
});
export const taskImportSchema = z.object({ tareas: z.array(taskImportRowSchema).max(500) });
export type TaskImportRow = z.infer<typeof taskImportRowSchema>;

export const URGENCY_LABEL: Record<number, string> = { 1: "Urgente", 2: "Alta", 3: "Normal", 4: "Sin urgencia" };

/** Acepta YYYY-MM-DD o dd/mm/aaaa; devuelve YYYY-MM-DD o null. */
export function parseTaskDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  return null;
}
function valid(y: number, mo: number, d: number) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

export function parseUrgency(v: unknown): number | null {
  const m = String(v ?? "").match(/[1-4]/);
  return m ? Number(m[0]) : null;
}

/** Viernes de la semana de `today` (si hoy es sábado/domingo, el viernes siguiente). */
export function fridayOf(today: string): string {
  const d = new Date(today + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0 dom..6 sáb
  const add = dow <= 5 ? 5 - dow : 6;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

/** Fecha final: la indicada; si no hay y es urgente (1), el viernes de esta semana. */
export function resolveDueDate(row: TaskImportRow, today: string): string | null {
  const explicit = parseTaskDate(row.fecha) ?? parseTaskDate(row.fecha_texto);
  if (explicit) return explicit;
  return parseUrgency(row.urgencia) === 1 ? fridayOf(today) : null;
}

export function buildTitle(row: TaskImportRow) {
  const t = (row.tarea ?? "").trim();
  const a = (row.asunto ?? "").trim();
  if (!a || t.toLowerCase().includes(a.toLowerCase())) return t;
  return `${a}: ${t}`;
}

export function buildNotes(row: TaskImportRow) {
  const u = parseUrgency(row.urgencia);
  const parts = [
    row.n != null && row.n !== "" ? `Ref. Excel nº ${row.n}` : null,
    row.persona ? `Persona: ${row.persona}` : null,
    row.cliente ? `Cliente: ${row.cliente}` : null,
    row.asunto ? `Asunto: ${row.asunto}` : null,
    u ? `Urgencia: ${u} ${URGENCY_LABEL[u]}` : null,
    row.fecha_texto ? `Fecha original: ${row.fecha_texto}` : null,
    row.origen ? `Origen: ${row.origen}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

export const CLAUDE_INSTRUCTIONS = `Eres un asistente que convierte una hoja de Excel de tareas en JSON para importarlas en interesante.app.

1. Lee la pestaña "NUEVAS" del Excel adjunto, salvo que te indique expresamente otra pestaña.
2. Cada fila con texto en la columna "Tarea para mí" es una tarea. Ignora la fila de cabeceras, filas vacías, totales y notas sueltas.
3. Columnas del Excel → campos JSON:
   - "Nº" → "n" (número)
   - "Persona" → "persona"
   - "Cliente" → "cliente"
   - "Asunto" → "asunto"
   - "Tarea para mí" → "tarea" (texto completo, sin resumir)
   - "Fecha" → "fecha" en formato YYYY-MM-DD si contiene una fecha reconocible (13/11/2026 → 2026-11-13). Si la celda tiene texto adicional ("desde 20/10/2026", "(caduca)"), copia la celda tal cual en "fecha_texto". Si no hay fecha, "fecha": null.
   - "Categoría" → "categoria" (texto tal cual)
   - "Urgencia" → "urgencia" como número: 1 Urgente, 2 Alta, 3 Normal, 4 Sin urgencia
   - "Origen" → "origen" (texto tal cual, p. ej. "Del 14/10" o "Nueva 15/10")
4. No inventes datos. Si una celda está vacía, usa null.
5. Respeta acentos y mayúsculas originales. No traduzcas.
6. Devuelve SOLO el JSON, sin explicaciones ni bloques de código, con esta forma exacta:

{
  "tareas": [
    {
      "n": 1,
      "persona": "Nicolás (AGEDI-AIE)",
      "cliente": "Fundació Damm",
      "asunto": "Licencia obligatoria",
      "tarea": "Firmar contrato en Signaturit cuando conteste el jurídico de la fundación y avisarle (te pide que no tarden)",
      "fecha": "2026-11-13",
      "fecha_texto": "13/11/2026 (caduca)",
      "categoria": "Contratos y firmas",
      "urgencia": 1,
      "origen": "Del 14/10"
    }
  ]
}`;
