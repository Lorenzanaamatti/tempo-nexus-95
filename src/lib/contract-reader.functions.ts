import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlazoSugerido = {
  label: string;
  trigger: string;
  pct: number | null;
  amount: number | null;
  due_date: string | null;
  quote: string;
};

export type LecturaContrato = {
  total: number | null;
  currency: string;
  plazos: PlazoSugerido[];
  notas: string;
};

const PROMPT = `Eres asistente legal-financiero de una agencia española de representación de compositores de música para cine y series.
Lees un contrato o deal memo y extraes ÚNICAMENTE los plazos de pago al representado/compositor.

Devuelve un JSON con estas claves:
- "total": importe total del encargo en número (sin símbolos) o null si no aparece.
- "currency": código de moneda, por defecto "EUR".
- "plazos": lista ordenada. Cada elemento con:
  - "label": nombre corto del plazo (ej. "A la firma", "Entrega de maquetas", "Entrega de masters").
  - "trigger": el hecho que dispara el pago, tal como lo describe el contrato.
  - "pct": porcentaje sobre el total (número 0-100) o null.
  - "amount": importe en número o null. Si hay total y porcentaje, calcúlalo.
  - "due_date": fecha concreta AAAA-MM-DD solo si el contrato la indica explícitamente; si depende de una entrega, null.
  - "quote": cita literal breve de la cláusula de la que sale el plazo.
- "notas": una o dos frases sobre retenciones, IVA, royalties u otras condiciones económicas relevantes. Vacío si no hay.

No inventes plazos ni fechas. Si no hay plazos de pago, devuelve "plazos": [] y explícalo en "notas".`;

async function leerStream(res: Response): Promise<string> {
  if (!res.body) throw new Error("La IA no ha devuelto respuesta");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    buf += decoder.decode(value, { stream: !done });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const ev = JSON.parse(line.slice(6)) as { type?: string; delta?: string };
        if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
      } catch {
        // evento incompleto
      }
    }
    if (done) break;
  }
  return out;
}

export const leerPlazosContrato = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        fileBase64: z.string().max(20_000_000).optional(),
        filename: z.string().max(300).optional(),
        text: z.string().max(200_000).optional(),
      })
      .refine((v) => v.fileBase64 || v.text, "Falta el documento")
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<LecturaContrato> => {
    const { data: staff } = await (context.supabase as any).rpc("current_user_is_staff");
    if (!staff) throw new Error("Solo el equipo puede leer contratos");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("La IA de la app no está configurada");

    const content: any[] = [];
    if (data.fileBase64) {
      content.push({
        type: "input_file",
        filename: data.filename || "contrato.pdf",
        file_data: `data:application/pdf;base64,${data.fileBase64}`,
      });
    }
    content.push({
      type: "input_text",
      text: data.text ? `Texto del contrato:\n${data.text}\n\nDevuelve solo el JSON.` : "Devuelve solo el JSON.",
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [
          { role: "system", content: PROMPT },
          { role: "user", content },
        ],
        text: { format: { type: "json_object" } },
      }),
    });
    if (!res.ok) {
      let msg = `La IA ha respondido ${res.status}`;
      try {
        const e = (await res.json()) as { error?: { message?: string }; message?: string };
        msg = e.error?.message ?? e.message ?? msg;
      } catch {
        // sin cuerpo
      }
      if (res.status === 402) msg = "No quedan créditos de IA en el espacio de trabajo.";
      if (res.status === 429) msg = "La IA está saturada. Inténtalo en un minuto.";
      throw new Error(msg);
    }
    const raw = await leerStream(res);
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
    const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    return {
      total: num(parsed.total),
      currency: String(parsed.currency || "EUR"),
      notas: String(parsed.notas ?? ""),
      plazos: (Array.isArray(parsed.plazos) ? parsed.plazos : []).map((p: any) => ({
        label: String(p.label ?? "Plazo"),
        trigger: String(p.trigger ?? ""),
        pct: num(p.pct),
        amount: num(p.amount),
        due_date: date(p.due_date),
        quote: String(p.quote ?? ""),
      })),
    };
  });
