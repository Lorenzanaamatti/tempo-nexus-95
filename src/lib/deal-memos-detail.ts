import { supabase } from "@/integrations/supabase/client";

export async function resolveEntity(
  kind: string | null,
  id: string | null,
): Promise<{ id: string; nombre: string } | null> {
  if (!id || !kind) return null;
  if (kind === "composer") {
    const { data } = await supabase.from("composers").select("id, full_name").eq("id", id).maybeSingle();
    return data ? { id: data.id, nombre: data.full_name } : null;
  }
  if (kind === "company") {
    const { data } = await supabase.from("production_companies").select("id, name").eq("id", id).maybeSingle();
    return data ? { id: data.id, nombre: data.name } : null;
  }
  return null;
}

/** Carga el deal memo con nombres resueltos de cliente, contraparte y validadores. */
export async function fetchDealMemo(dealMemoId: string) {
  const { data, error } = await supabase
    .from("deal_memos")
    .select("*, plantilla:plantilla_id(id, nombre, activa)")
    .eq("id", dealMemoId)
    .single();
  if (error) throw error;
  const dm: any = data;
  const [cliente, contraparte, vi, vf] = await Promise.all([
    resolveEntity(dm.cliente_kind, dm.cliente_id),
    resolveEntity(dm.contraparte_kind, dm.contraparte_id),
    dm.validador_interno_id
      ? supabase.from("people").select("id, full_name, email").eq("id", dm.validador_interno_id).maybeSingle().then((r) => r.data)
      : null,
    dm.validador_final_id
      ? supabase.from("people").select("id, full_name, email").eq("id", dm.validador_final_id).maybeSingle().then((r) => r.data)
      : null,
  ]);
  dm.cliente = cliente;
  dm.contraparte = contraparte;
  dm.validador_interno = vi ? { id: vi.id, nombre: vi.full_name } : null;
  dm.validador_final = vf ? { id: vf.id, nombre: vf.full_name } : null;
  return dm;
}
