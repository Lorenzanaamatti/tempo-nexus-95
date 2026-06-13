import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ChatMsg = { role: "user" | "assistant"; content: string };

type Input = {
  personId: string;
  messages: ChatMsg[];
};

function validate(input: unknown): Input {
  const i = input as Input;
  if (!i || typeof i.personId !== "string") throw new Error("personId requerido");
  if (!Array.isArray(i.messages) || i.messages.length === 0) throw new Error("messages requerido");
  for (const m of i.messages) {
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      throw new Error("formato de mensaje inválido");
    }
    if (m.content.length > 8000) throw new Error("mensaje demasiado largo");
  }
  if (i.messages.length > 40) throw new Error("conversación demasiado larga");
  return { personId: i.personId, messages: i.messages };
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

    const { supabase } = context;
    const { data: person, error } = await supabase
      .from("people")
      .select("full_name, assistant_persona, assistant_model, is_virtual_assistant")
      .eq("id", data.personId)
      .single();
    if (error) throw new Error(error.message);
    if (!person?.is_virtual_assistant) throw new Error("Esta persona no es un asistente virtual");

    const system =
      person.assistant_persona ??
      `Eres ${person.full_name}, asistente virtual de Claude integrado en el equipo IC.`;
    const model = person.assistant_model || "claude-sonnet-4-5-20250929";

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Claude API error", resp.status, txt);
      throw new Error(`Claude error ${resp.status}: ${txt.slice(0, 500)}`);
    }
    const json = (await resp.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      json.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n") ?? "";
    return { reply: text, model };
  });