import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PersonEventsEditor } from "@/components/person-events-editor";
import { PersonAssignmentsEditor } from "@/components/person-assignments-editor";
import { SaveButton } from "@/components/save-button";
import { AssistantChat } from "@/components/assistant-chat";
import { PersonIcFunctionsEditor } from "@/components/person-ic-functions-editor";
import { IC_FUNCTION_GROUPS, IC_FUNCTION_LABEL, type IcTeamFunction } from "@/components/person-ic-functions-editor";
import { PersonVerifiersEditor } from "@/components/person-verifiers-editor";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RelatedWorks } from "@/components/related-works";

export const Route = createFileRoute("/_authenticated/_admin/people/$personId")({
  component: PersonEdit,
});

type PersonRole = "ic_team" | "composer" | "artist" | "supervisor";
const ROLE_LABEL: Record<PersonRole, string> = {
  ic_team: "Equipo IC",
  composer: "Compositor",
  artist: "Artista",
  supervisor: "Supervisor",
};

function PersonEdit() {
  const { personId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["person", personId],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("*").eq("id", personId).single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ full_name: "", role: "ic_team" as PersonRole, email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [fnPicker, setFnPicker] = useState<string>("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [assistantModel, setAssistantModel] = useState<string>("claude-sonnet-4-5-20250929");
  const [assistantPersona, setAssistantPersona] = useState<string>("");

  async function addIcFunction(fn: IcTeamFunction) {
    const { error } = await (supabase as any)
      .from("person_ic_functions")
      .insert({ person_id: personId, function: fn });
    if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
      return toast.error(error.message);
    }
    toast.success(`Función añadida: ${IC_FUNCTION_LABEL[fn]}`);
    // Trigger refresh of the IC functions editor list.
    window.dispatchEvent(new CustomEvent("person-ic-functions:refresh", { detail: { personId } }));
  }

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        role: data.role as PersonRole,
        email: data.email ?? "",
        phone: data.phone ?? "",
        notes: data.notes ?? "",
      });
      setIsVirtual(!!data.is_virtual_assistant);
      setAssistantModel((data as any).assistant_model || "claude-sonnet-4-5-20250929");
      setAssistantPersona((data as any).assistant_persona || "");
    }
  }, [data]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("people")
      .update({
        full_name: form.full_name,
        role: form.role,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
        is_virtual_assistant: isVirtual,
        assistant_model: isVirtual ? assistantModel : undefined,
        assistant_persona: isVirtual ? (assistantPersona || undefined) : undefined,
      } as any)
      .eq("id", personId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    refetch();
  }

  async function remove() {
    if (!confirm("¿Eliminar esta persona? Se perderán sus eventos del calendario.")) return;
    const { error } = await supabase.from("people").delete().eq("id", personId);
    if (error) return toast.error(error.message);
    navigate({ to: "/people" });
  }

  if (isLoading || !data) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <Link to="/people" className="smallcaps text-xs text-muted-foreground hover:underline">← Personas</Link>
          <h1 className="mt-1 flex items-center gap-3 font-display text-4xl">
            {form.full_name || "—"}
            {data.is_virtual_assistant && (
              <Badge variant="outline" className="rounded-sm smallcaps text-[10px]">
                <Sparkles className="mr-1 h-3 w-3" /> Agente virtual
              </Badge>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          {data.composer_id && (
            <Button asChild variant="outline" size="sm">
              <Link to="/composers/$composerId" params={{ composerId: data.composer_id }}>
                Abrir ficha de compositor
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={remove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Nombre completo</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} disabled={!!data.composer_id} />
        </div>
        <div>
          {form.role === "ic_team" ? (
            <>
              <Label>Rol (función IC)</Label>
              <Select
                value={fnPicker}
                onValueChange={(v) => {
                  setFnPicker("");
                  addIcFunction(v as IcTeamFunction);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Añadir función IC…" />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {IC_FUNCTION_GROUPS.map((g) => (
                    <div key={g.label}>
                      <div className="smallcaps px-2 py-1 text-[10px] text-muted-foreground">{g.label}</div>
                      {g.items.map((it) => (
                        <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                38 funciones disponibles. Cada selección añade la función a esta persona.
              </p>
            </>
          ) : (
            <>
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as PersonRole })} disabled={!!data.composer_id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as PersonRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
        {form.role === "ic_team" && (
          <div className="sm:col-span-2 flex items-center justify-between rounded-sm border border-dashed border-border p-3">
            <div>
              <Label className="text-sm">Agente virtual (IA)</Label>
              <p className="text-[11px] text-muted-foreground">
                Las personas reales no llevan verificador. Los agentes virtuales sí.
              </p>
            </div>
            <Switch checked={isVirtual} onCheckedChange={setIsVirtual} />
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Eventos en el calendario</h2>
        <PersonEventsEditor personId={personId} />
      </div>

      {(form.role === "supervisor" || form.role === "composer" || form.role === "artist") && (
        <div className="mt-10">
          <RelatedWorks
            kind={form.role === "supervisor" ? "supervisor" : "composer-person"}
            id={form.role === "supervisor" ? personId : (data.composer_id ?? personId)}
            personId={personId}
            title="Obras vinculadas (cruce CRM)"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Aparecen automáticamente las Producciones IC y Películas ES donde esta persona figura.
          </p>
        </div>
      )}

      {form.role === "ic_team" && (
        <div className="mt-10">
          <h2 className="mb-1 font-display text-2xl">Funciones en el equipo IC</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Marca todas las funciones que asume esta persona. Cada persona puede tener varias funciones simultáneas.
          </p>
          <PersonIcFunctionsEditor personId={personId} />
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Representados asignados</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Cruza esta persona con uno o varios representados. Cada asignación define rol, fecha de inicio, objetivos y revisión KPI.
        </p>
        <PersonAssignmentsEditor personId={personId} />
      </div>

      {form.role === "ic_team" && isVirtual && (
        <div className="mt-10">
          <h2 className="mb-3 font-display text-2xl">Verificadores asignados</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Asigna una o varias personas reales del equipo IC como verificadoras de este agente virtual.
          </p>
          <PersonVerifiersEditor personId={personId} />
        </div>
      )}

      {data.is_virtual_assistant && (
        <div className="mt-10">
          <h2 className="mb-3 font-display text-2xl">Chat con {form.full_name}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Asistente virtual integrado con Anthropic Claude. Las respuestas se generan en tiempo real con el rol asignado a {form.full_name} dentro del equipo IC.
          </p>
          <AssistantChat personId={personId} name={form.full_name || "Asistente"} />
        </div>
      )}
      <SaveButton floating onClick={save} saving={saving} />
    </div>
  );
}