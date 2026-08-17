const TMDB_BASE = "https://api.themoviedb.org/3";

export type TmdbCrew = { job: string; department: string; name: string };
export type TmdbProvider = { provider_name: string };

export function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const token = process.env['TMDB_READ_TOKEN'];
  if (!token) throw new Error("TMDB_READ_TOKEN no configurado");
  const url = new URL(TMDB_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDb ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function adminCheck(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Solo administradores");
}
