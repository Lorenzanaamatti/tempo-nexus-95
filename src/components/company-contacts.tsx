import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/list-states";
import { toast } from "sonner";
import { Plus, Users, Star } from "lucide-react";

const db = supabase as any;

export type CompanyContact = {
  id: string;
  full_name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_primary: boolean;
};

/** Lista de contactos de una productora. Acepta el id de la ficha de productora o el de Partners. */
export function CompanyContacts({
  productionCompanyId,
  partnerId,
}: {
  productionCompanyId?: string | null;
  partnerId?: string | null;
}) {
  const qc = useQueryClient();
  const key = ["company-contacts", productionCompanyId ?? null, partnerId ?? null];
  const [fullName, setFullName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const listQ = useQuery({
    queryKey: key,
    enabled: !!(productionCompanyId || partnerId),
    queryFn: async () => {
      let q = db.from("company_contacts").select("id, full_name, role_title, email, phone, notes, is_primary");
      q = productionCompanyId
        ? q.eq("production_company_id", productionCompanyId)
        : q.eq("partner_id", partnerId);
      const { data, error } = await q.order("is_primary", { ascending: false }).order("full_name");
      if (error) throw error;
      return (data ?? []) as CompanyContact[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: key });
  }

  async function add() {
    if (!fullName.trim()) return;
    const { error } = await db.from("company_contacts").insert({
      production_company_id: productionCompanyId || null,
      partner_id: productionCompanyId ? null : partnerId || null,
      full_name: fullName.trim(),
      role_title: roleTitle.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      is_primary: !(listQ.data ?? []).length,
    });
    if (error) return toast.error(error.message);
    setFullName(""); setRoleTitle(""); setEmail(""); setPhone("");
    invalidate();
  }

  async function update(id: string, patch: Partial<CompanyContact>) {
    const { error } = await db.from("company_contacts").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function makePrimary(id: string) {
    const ids = (listQ.data ?? []).map((c) => c.id);
    await Promise.all(ids.map((cid) => db.from("company_contacts").update({ is_primary: cid === id }).eq("id", cid)));
    invalidate();
  }

  async function remove(id: string) {
    const { error } = await db.from("company_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  const rows = listQ.data ?? [];

  return (
    <div className="space-y-3">
      <div className="grid gap-2 rounded-sm border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_1fr_150px_auto]">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre y apellidos" />
        <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Cargo" />
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" />
        <Button onClick={add} disabled={!fullName.trim()}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
      </div>

      {listQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando contactos…</p>
      ) : listQ.error ? (
        <p className="text-sm text-destructive">{(listQ.error as any)?.message}</p>
      ) : !rows.length ? (
        <EmptyState variant="inline" icon={Users} title="Sin contactos" description="Añade las personas de contacto de esta productora." />
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id} className="rounded-sm border border-border p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[160px] flex-1">
                  <Label className="smallcaps text-[10px] text-muted-foreground">Nombre</Label>
                  <Input value={c.full_name} onChange={(e) => update(c.id, { full_name: e.target.value })} />
                </div>
                <div className="min-w-[140px] flex-1">
                  <Label className="smallcaps text-[10px] text-muted-foreground">Cargo</Label>
                  <Input value={c.role_title ?? ""} onChange={(e) => update(c.id, { role_title: e.target.value || null })} />
                </div>
                <div className="min-w-[160px] flex-1">
                  <Label className="smallcaps text-[10px] text-muted-foreground">Email</Label>
                  <Input value={c.email ?? ""} onChange={(e) => update(c.id, { email: e.target.value || null })} />
                </div>
                <div className="w-36">
                  <Label className="smallcaps text-[10px] text-muted-foreground">Teléfono</Label>
                  <Input value={c.phone ?? ""} onChange={(e) => update(c.id, { phone: e.target.value || null })} />
                </div>
                <Button
                  type="button"
                  variant={c.is_primary ? "default" : "outline"}
                  size="sm"
                  onClick={() => makePrimary(c.id)}
                  title="Marcar como contacto principal"
                >
                  <Star className="mr-1 h-4 w-4" /> {c.is_primary ? "Principal" : "Hacer principal"}
                </Button>
                <ConfirmDeleteButton iconOnly title="¿Eliminar este contacto?" onConfirm={() => remove(c.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
