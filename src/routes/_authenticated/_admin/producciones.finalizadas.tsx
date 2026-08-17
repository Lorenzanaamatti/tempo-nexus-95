import { ExportRowsButton } from "@/components/export-rows-button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive } from "lucide-react";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { ProductionSearch, YearGroupedProductions, useProductions } from "@/components/production-lists";
import { isFinalized } from "@/lib/production-lifecycle";

export const Route = createFileRoute("/_authenticated/_admin/producciones/finalizadas")({
  component: ProduccionesFinalizadas,
});

function ProduccionesFinalizadas() {
  const productionsQ = useProductions();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (productionsQ.data ?? [])
      .filter((p) => isFinalized(p.status))
      .filter((p) => !needle || p.title.toLowerCase().includes(needle));
  }, [productionsQ.data, q]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Producciones</p>
          <h1 className="mt-1 font-display text-5xl title-caps">PRODUCCIONES FINALIZADAS</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Archivo histórico de producciones cerradas, agrupadas por año.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProductionSearch value={q} onChange={setQ} />
          <ExportRowsButton rows={rows} filename="producciones-finalizadas" sheetName="Finalizadas" />
        </div>
      </div>

      {productionsQ.isLoading ? (
        <ListSkeleton rows={6} />
      ) : !rows.length ? (
        <EmptyState icon={Archive} title="Sin producciones finalizadas" description="Aquí aparecerán las producciones cuando se marquen como finalizadas." />
      ) : (
        <YearGroupedProductions rows={rows} />
      )}
    </div>
  );
}
