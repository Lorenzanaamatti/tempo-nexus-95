import { PaginationBar, SortTh, useServerPagination } from "@/components/pagination-bar";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ExternalLink } from "lucide-react";
import { formatDateEs } from "@/lib/dates";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  CONTRACT_LANG_LABEL,
  CONTRACT_TYPE_SUGGESTIONS,
  type ContractStatus,
  type ContractLanguage,
} from "@/lib/contract-constants";

export const Route = createFileRoute("/_authenticated/_admin/contracts/")({
  component: ContractsIndex,
});

type SortKey = "title" | "contract_type" | "signer_name" | "signed_date" | "end_date" | "notice_date" | "sign_status" | "language";

function ContractsIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const pg = useServerPagination<SortKey>({
    sortKey: "signed_date",
    sortDir: "desc",
    pageSize: 50,
    deps: [q, statusFilter, langFilter, typeFilter],
  });

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("");
  const [newSigner, setNewSigner] = useState("");
  const [newLang, setNewLang] = useState<ContractLanguage>("es");
  const [creating, setCreating] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["contracts", q, statusFilter, langFilter, typeFilter, pg.page, pg.pageSize, pg.sortKey, pg.sortDir],
    queryFn: async () => {
      let query = (supabase as any)
        .from("contracts")
        .select(
          "id, title, contract_type, signer_name, counterparty, signed_date, end_date, notice_date, sign_status, language, url",
          { count: "exact" },
        );
      const needle = q.trim();
      if (needle) {
        query = query.or(
          ["title", "contract_type", "signer_name", "counterparty"].map((c) => `${c}.ilike.%${needle}%`).join(","),
        );
      }
      if (statusFilter !== "all") query = query.eq("sign_status", statusFilter);
      if (langFilter !== "all") query = query.eq("language", langFilter);
      if (typeFilter !== "all") query = query.eq("contract_type", typeFilter);
      const { data, error, count } = await pg.applyTo(query);
      if (error) throw error;
      return { rows: (data ?? []) as any[], count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

  const rows = result?.rows ?? [];
  const total = result?.count ?? 0;

  const types = useMemo(() => {
    const fromData = rows.map((c: any) => c.contract_type).filter(Boolean);
    return Array.from(new Set<string>([...CONTRACT_TYPE_SUGGESTIONS, ...fromData])).sort();
  }, [rows]);

  async function create() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const { error } = await (supabase as any).from("contracts").insert({
      title: newTitle.trim(),
      contract_type: newType || null,
      signer_name: newSigner || null,
      language: newLang,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    setNewTitle(""); setNewType(""); setNewSigner("");
    toast.success("Contrato creado");
    qc.invalidateQueries({ queryKey: ["contracts"] });
  }

  const Th = (props: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <SortTh k={props.k} sortKey={pg.sortKey} sortDir={pg.sortDir} onSort={pg.toggleSort} className={props.className}>
      {props.children}
    </SortTh>
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Repositorio</p>
          <h1 className="mt-1 font-display text-5xl">CONTRATOS</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Todos los contratos asociados a IC. Ordena por tipo, firmante, fechas, estado de firma o idioma.
          </p>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contrato…" className="w-64 rounded-sm" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {(Object.keys(CONTRACT_STATUS_LABEL) as ContractStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{CONTRACT_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={langFilter} onValueChange={setLangFilter}>
            <SelectTrigger className="w-40 rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los idiomas</SelectItem>
              {(Object.keys(CONTRACT_LANG_LABEL) as ContractLanguage[]).map((l) => (
                <SelectItem key={l} value={l}>{CONTRACT_LANG_LABEL[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-56 rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {types.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-4 sm:grid-cols-12">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título del contrato…" className="sm:col-span-4" />
        <div className="sm:col-span-3">
          <Select value={newType || undefined} onValueChange={setNewType}>
            <SelectTrigger><SelectValue placeholder="Tipo…" /></SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPE_SUGGESTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Input value={newSigner} onChange={(e) => setNewSigner(e.target.value)} placeholder="Firmante" className="sm:col-span-3" />
        <div className="sm:col-span-1">
          <Select value={newLang} onValueChange={(v) => setNewLang(v as ContractLanguage)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CONTRACT_LANG_LABEL) as ContractLanguage[]).map((l) => (
                <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={create} disabled={creating} className="sm:col-span-1"><Plus className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">Sin contratos.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <Th k="title">Título</Th>
                <Th k="contract_type">Tipo</Th>
                <Th k="signer_name">Firmante</Th>
                <Th k="signed_date">Firma</Th>
                <Th k="end_date">Fin</Th>
                <Th k="notice_date">Preaviso</Th>
                <Th k="sign_status">Estado</Th>
                <Th k="language">Idioma</Th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link to="/contracts/$contractId" params={{ contractId: c.id }} className="font-display hover:underline">{c.title}</Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.contract_type || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.signer_name || c.counterparty || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{formatDateEs(c.signed_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{formatDateEs(c.end_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{formatDateEs(c.notice_date)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${CONTRACT_STATUS_TONE[c.sign_status as ContractStatus]}`}>
                      {CONTRACT_STATUS_LABEL[c.sign_status as ContractStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground smallcaps text-[10px]">{c.language?.toUpperCase()}</td>
                  <td className="px-3 py-2 text-right">
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PaginationBar
        page={pg.page}
        pageCount={pg.pageCountOf(total)}
        pageSize={pg.pageSize}
        total={total}
        onPageChange={pg.setPage}
        onPageSizeChange={pg.setPageSize}
        label="contratos"
      />
    </div>
  );
}