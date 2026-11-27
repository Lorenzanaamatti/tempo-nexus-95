import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/_admin/empresa/actividad-usuarios")({
  component: ActividadUsuarios,
});

const RANGES = { "1": "Hoy", "7": "7 días", "30": "30 días" } as const;

function fmtDur(s: number) {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function ActividadUsuarios() {
  const { isBigC, loading } = useCurrentRole();
  const [days, setDays] = useState<keyof typeof RANGES>("7");
  const [who, setWho] = useState<string>("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["app-page-visits", days],
    enabled: isBigC,
    queryFn: async () => {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (Number(days) - 1));
      const { data, error } = await supabase
        .from("app_page_visits")
        .select("id, email, user_id, path, started_at, duration_seconds")
        .gte("started_at", from.toISOString())
        .order("started_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const people = useMemo(() => {
    const m = new Map<string, { email: string; visits: number; secs: number; last: string; days: Set<string> }>();
    for (const v of data) {
      const k = v.email ?? v.user_id;
      const cur = m.get(k) ?? { email: k, visits: 0, secs: 0, last: v.started_at, days: new Set<string>() };
      cur.visits += 1;
      cur.secs += v.duration_seconds;
      cur.days.add(v.started_at.slice(0, 10));
      if (v.started_at > cur.last) cur.last = v.started_at;
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [data]);

  const rows = who ? data.filter((v) => (v.email ?? v.user_id) === who) : data;

  if (loading) return <p className="p-8 text-muted-foreground">Cargando…</p>;
  if (!isBigC) return <p className="p-8 text-muted-foreground">Sin acceso: esta vista es solo para BIG C.</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Actividad de usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quién entra, con qué login, qué páginas visita, cuándo y cuánto tiempo.</p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((k) => (
            <button key={k} type="button" onClick={() => setDays(k)}
              className={`rounded-full border px-4 py-1 text-sm ${days === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
              {RANGES[k]}
            </button>
          ))}
        </div>
      </header>

      <section>
        <h2 className="mb-3 font-display text-xl">Por persona</h2>
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Login</th><th className="px-3 py-2">Último acceso</th><th className="px-3 py-2">Días activos</th><th className="px-3 py-2">Páginas vistas</th><th className="px-3 py-2">Tiempo total</th><th /></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-3 py-3 text-muted-foreground" colSpan={6}>Cargando…</td></tr>}
              {!isLoading && people.length === 0 && <tr><td className="px-3 py-3 text-muted-foreground" colSpan={6}>Sin actividad registrada en este periodo.</td></tr>}
              {people.map((p) => (
                <tr key={p.email} className={`border-t border-border ${who === p.email ? "bg-accent/40" : ""}`}>
                  <td className="px-3 py-2 font-medium">{p.email}</td>
                  <td className="px-3 py-2">{fmtDate(p.last)}</td>
                  <td className="px-3 py-2">{p.days.size}</td>
                  <td className="px-3 py-2">{p.visits}</td>
                  <td className="px-3 py-2">{fmtDur(p.secs)}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="text-xs text-[color:var(--rust)] hover:underline" onClick={() => setWho(who === p.email ? "" : p.email)}>
                      {who === p.email ? "Ver todos" : "Ver detalle"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl">{who ? `Páginas visitadas por ${who}` : "Últimas páginas visitadas"}</h2>
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Cuándo</th><th className="px-3 py-2">Login</th><th className="px-3 py-2">Página</th><th className="px-3 py-2">Tiempo</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 500).map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(v.started_at)}</td>
                  <td className="px-3 py-2">{v.email ?? v.user_id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{v.path}</td>
                  <td className="px-3 py-2">{fmtDur(v.duration_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
