import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchDealMemo } from "@/lib/deal-memos-detail";
import { DealMemoHeader } from "@/components/deal-memos/detail/header";
import { DealMemoDocument } from "@/components/deal-memos/detail/document";
import { DealMemoForm } from "@/components/deal-memos/detail/form";
import { DealMemoVersions } from "@/components/deal-memos/detail/versions";
import { DealMemoLog } from "@/components/deal-memos/detail/log";
import { DealMemoNotas } from "@/components/deal-memos/detail/notas";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/$dealMemoId")({
  component: DealMemoDetail,
});

function DealMemoDetail() {
  const { dealMemoId } = Route.useParams();
  const qc = useQueryClient();

  const dmQ = useQuery({
    queryKey: ["deal-memo", dealMemoId],
    queryFn: () => fetchDealMemo(dealMemoId),
  });

  if (dmQ.isLoading) return <div className="mx-auto max-w-[1100px] px-6 py-8"><Skeleton className="h-[400px]" /></div>;
  if (dmQ.error || !dmQ.data) return <p className="p-10 text-rose-600">No se pudo cargar el deal memo</p>;

  const dm = dmQ.data;
  const onChange = () => qc.invalidateQueries({ queryKey: ["deal-memo", dealMemoId] });

  return (
    <div>
      <DealMemoHeader dm={dm} onChange={onChange} />
      <div className="mx-auto max-w-[1100px] px-6 py-6">
        <Tabs defaultValue="documento">
          <TabsList>
            <TabsTrigger value="documento">Documento</TabsTrigger>
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="versiones">Versiones</TabsTrigger>
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>
          <TabsContent value="documento" className="pt-4"><DealMemoDocument dm={dm} /></TabsContent>
          <TabsContent value="datos" className="pt-4"><DealMemoForm dm={dm} onSaved={onChange} /></TabsContent>
          <TabsContent value="versiones" className="pt-4"><DealMemoVersions dm={dm} onChange={onChange} /></TabsContent>
          <TabsContent value="log" className="pt-4"><DealMemoLog dealMemoId={dm.id} /></TabsContent>
          <TabsContent value="notas" className="pt-4"><DealMemoNotas dm={dm} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
