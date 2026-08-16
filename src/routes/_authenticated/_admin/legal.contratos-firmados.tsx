import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { formatDateEs } from "@/lib/dates";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/list-states";

export const Route = createFileRoute("/_authenticated/_admin/legal/contratos-firmados")({
  component: SignedContracts,
});

type Row = {
  id: string;
  title: string;
  contract_type: string | null;
  signer_name: string | null;
  counterparty: string | null;
  signed_date: string | null;
  end_date: string | null;
  url: string | null;
};

function SignedContracts() {
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["signed-contracts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contracts")
        .select("id, title, contract_type, signer_name, counterparty, signed_date, end_date, url")
        .eq("sign_status", "firmado")
        .order("signed_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const needle = q.trim().toLowerCase();
  const rows = (data ?? []).filter((r) =>
    !needle ||
    [r.title, r.contract_type, r.signer_name, r.counterparty]
      .some((v) => (v ?? "").toLowerCase().includes(needle)),
  );

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.contract_type?.trim() || "Sin categoría";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Legal</p>
        <h1 className="mt-1 font-display text-5xl">Contratos firmados</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Todos los contratos firmados, agrupados por categoría, tal como constan en las fichas de cada
          persona representada o del equipo.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, categoría o firmante…"
          className="h-9 max-w-sm text-sm"
        />
        <span className="text-xs text-muted-foreground">{rows.length} contrato(s)</span>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : !sorted.length ? (
        <EmptyState title="No hay contratos firmados" hint="Los contratos aparecerán aquí al marcarse como firmados." />
      ) : (
        <div className="space-y-8">
          {sorted.map(([cat, items]) => (
            <section key={cat}>
              <h2 className="mb-2 font-display text-2xl">
                {cat} <span className="text-base text-muted-foreground">{items.length}</span>
              </h2>
              <ul className="divide-y divide-border rounded-sm border border-border">
                {items.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2 hover:bg-muted/40">
                    <Link
                      to="/contracts/$contractId"
                      params={{ contractId: c.id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate text-sm">{c.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[c.signer_name, c.counterparty].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Firmado {c.signed_date ? formatDateEs(c.signed_date) : "—"}
                      {c.end_date ? ` · Vence ${formatDateEs(c.end_date)}` : ""}
                    </span>
                    {c.url && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                        <a href={c.url} target="_blank" rel="noreferrer" aria-label="Abrir documento">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
