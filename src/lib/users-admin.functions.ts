// Política de usuarios: docs/POLITICA_USUARIOS.md
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  status: "pending" | "active" | "rejected";
  created_at: string;
  composer_id: string | null;
  roles: string[];
  last_sign_in_at: string | null;
};

async function ensureBigC(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureBigC(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, authList] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, display_name, status, created_at, composer_id")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);
    if (authList.error) throw new Error(authList.error.message);

    const emailById = new Map<string, { email: string | null; last: string | null }>();
    for (const u of authList.data.users) {
      emailById.set(u.id, { email: u.email ?? null, last: u.last_sign_in_at ?? null });
    }
    const rolesById = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesById.get(r.user_id) ?? [];
      arr.push(r.role as string);
      rolesById.set(r.user_id, arr);
    }
    const users: AdminUser[] = (profiles ?? []).map((p) => {
      const meta = emailById.get(p.id);
      return {
        id: p.id,
        email: meta?.email ?? null,
        display_name: p.display_name,
        status: p.status as AdminUser["status"],
        created_at: p.created_at as string,
        composer_id: p.composer_id ?? null,
        roles: rolesById.get(p.id) ?? [],
        last_sign_in_at: meta?.last ?? null,
      };
    });
    return users;
  });

type SetRoleInput = {
  userId: string;
  role: "admin" | "team" | "composer" | null;
  status: "pending" | "active" | "rejected";
};

export const setUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): SetRoleInput => {
    const i = input as SetRoleInput;
    if (!i || typeof i.userId !== "string") throw new Error("userId requerido");
    if (i.role !== null && !["admin", "team", "composer"].includes(i.role)) {
      throw new Error("role inválido");
    }
    if (!["pending", "active", "rejected"].includes(i.status)) {
      throw new Error("status inválido");
    }
    return { userId: i.userId, role: i.role, status: i.status };
  })
  .handler(async ({ data, context }) => {
    await ensureBigC(context);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("No puedes quitarte a ti mismo el rol BIG C");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);

    if (data.role) {
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (insErr) throw new Error(insErr.message);
    }

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });

type DeleteUserInput = { userId: string; email: string };

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): DeleteUserInput => {
    const value = input as DeleteUserInput;
    if (!value || typeof value.userId !== "string" || typeof value.email !== "string") throw new Error("Usuario y correo requeridos");
    return { userId: value.userId, email: value.email.trim().toLowerCase() };
  })
  .handler(async ({ data, context }) => {
    await ensureBigC(context);
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: account, error: accountError } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (accountError) throw new Error(accountError.message);
    if (!account.user || account.user.email?.toLowerCase() !== data.email) throw new Error("La cuenta ha cambiado. Actualiza la lista antes de eliminarla.");

    // Varias tablas referencian auth.users sin ON DELETE CASCADE/SET NULL,
    // así que hay que desvincular esos registros antes de borrar la cuenta:
    // - columnas NOT NULL (p. ej. billing_orders.created_by) se reasignan al admin que ejecuta el borrado;
    // - columnas anulables se ponen a NULL.
    const reassignToAdmin: Array<{ table: string; column: string }> = [
      { table: "billing_orders", column: "created_by" },
      { table: "billing_manual_lines", column: "created_by" },
    ];
    const setToNull: Array<{ table: string; column: string }> = [
      { table: "billing_manual_lines", column: "last_edited_by" },
      { table: "billing_invoices", column: "created_by" },
      { table: "billing_invoices", column: "last_edited_by" },
      { table: "candidacy_files", column: "uploaded_by" },
      { table: "oportunidades_pitches", column: "archivado_by" },
      { table: "career_plans", column: "created_by" },
      { table: "production_billing_sprints", column: "last_edited_by" },
      { table: "sales_document_compositions", column: "created_by" },
      { table: "subv_expedientes", column: "created_by" },
    ];
    const admin = supabaseAdmin as any;
    for (const { table, column } of reassignToAdmin) {
      const { error: updErr } = await admin
        .from(table)
        .update({ [column]: context.userId })
        .eq(column, data.userId);
      if (updErr) throw new Error(`No se pudo reasignar ${table}.${column}: ${updErr.message}`);
    }
    for (const { table, column } of setToNull) {
      const { error: updErr } = await admin
        .from(table)
        .update({ [column]: null })
        .eq(column, data.userId);
      if (updErr) throw new Error(`No se pudo desvincular ${table}.${column}: ${updErr.message}`);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
