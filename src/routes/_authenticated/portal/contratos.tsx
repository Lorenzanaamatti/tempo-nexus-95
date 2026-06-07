import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE, type ContractStatus } from "@/lib/contract-constants";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/portal/contratos")({
  component: Contratos,
});

function Contratos() {
  const { composerId } = useCurrentRole();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-contratos", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const [{ data: contracts }, { data: docs }] = await Promise.all([
        (supabase as any)
          .from("contracts")
          .select("id, title, contract_type, sign_status, signed_date, end_date, notice_date, language, counterparty, partner_company:production_companies(name), url, storage_path, notes")
          .or(`composer_id.eq.${composerId},signer_composer_id.eq.${composerId}`)
          .order("updated_at", { ascending: false }),
        supabase
          .from("composer_documents")
          .select("id, title, kind, url, notes")
          .eq("composer_id", composerId!)
          .order("position"),
      ]);
      return { contracts: contracts ?? [], docs: docs ?? [] };
    },
  });

  const isSettlement = (k?: string | null) =>
    !!k && /liquidaci|settle|royalt/i.test(k);
  const isContract = (k?: string | null) =>
    !!k && /contrat|acuerdo|addendum|anexo/i.test(k);

  const docs = data?.docs ?? [];
  const contracts = data?.contracts ?? [];
  const liquidaciones = docs.filter((d) => isSettlement(d.kind));
  const otros = docs.filter(
    (d) => !isContract(d.kind) && !isSettlement(d.kind),
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Contratos y derechos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Documentación contractual, acuerdos y materiales legales asociados a tu representación.
        </p>
      </header>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <ContractSection contracts={contracts} />
          <DocSection title="Liquidaciones trimestrales" docs={liquidaciones} empty="Aún no hay liquidaciones publicadas." />
          <DocSection title="Otros documentos" docs={otros} empty="No hay documentos adicionales." />
        </>
      )}
    </div>
  );
}

type Contract = {
  id: string;
  title: string;
  contract_type: string | null;
  sign_status: ContractStatus;
  signed_date: string | null;
  end_date: string | null;
  notice_date: string | null;
  language: string | null;
  counterparty: string | null;
  partner_company: { name: string } | null;
  url: string | null;
  storage_path: string | null;
  notes: string | null;
};

function ContractSection({ contracts }: { contracts: Contract[] }) {
  return (
    <section className="space-y-3">
      <h3 className="font-display text-xl">Contratos registrados por IC</h3>
      {!contracts.length ? (
        <p className="text-sm text-muted-foreground">Aún no hay contratos vinculados a tu ficha.</p>
      ) : (
        <ul className="space-y-3">
          {contracts.map((c) => (
            <li key={c.id} className="rounded-sm border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-lg">{c.title}</p>
                <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${CONTRACT_STATUS_TONE[c.sign_status] ?? ""}`}>
                  {CONTRACT_STATUS_LABEL[c.sign_status] ?? c.sign_status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {[c.contract_type, c.partner_company?.name || c.counterparty].filter(Boolean).join(" · ") || "—"}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div><span className="smallcaps">Firma:</span> {formatDateEs(c.signed_date)}</div>
                <div><span className="smallcaps">Preaviso:</span> {formatDateEs(c.notice_date)}</div>
                <div><span className="smallcaps">Fin:</span> {formatDateEs(c.end_date)}</div>
              </div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary underline">
                  Abrir documento
                </a>
              )}
              {c.notes && <p className="mt-2 whitespace-pre-wrap text-xs">{c.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Doc = { id: string; title: string; kind: string | null; url: string | null; notes: string | null };

function DocSection({ title, docs, empty }: { title: string; docs: Doc[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h3 className="font-display text-xl">{title}</h3>
      {!docs.length ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => (
            <li key={d.id} className="rounded-sm border border-border p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-display text-lg">{d.title}</p>
                {d.kind && <span className="smallcaps text-xs text-muted-foreground">{d.kind}</span>}
              </div>
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-primary underline">
                  Abrir documento
                </a>
              )}
              {d.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{d.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}