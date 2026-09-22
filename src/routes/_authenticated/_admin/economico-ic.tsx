import { createFileRoute } from "@tanstack/react-router";
import { LineChart, Receipt, FileText, Gauge } from "lucide-react";
import { SectionLanding, } from "@/components/section-landing";
import type { Door } from "@/components/section-doors";

export const Route = createFileRoute("/_authenticated/_admin/economico-ic")({
  component: EconomicoIC,
  head: () => ({ meta: [
    { title: "Económico IC | Interesante Compañía" },
    { name: "description", content: "Acceso al dashboard económico, plan de facturación y presupuestos de Interesante Compañía." },
    { property: "og:title", content: "Económico IC | Interesante Compañía" },
    { property: "og:description", content: "Gestión económica de Interesante Compañía." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const DOORS: Door[] = [
  { title: "Dashboard económico", description: "Visión global de ingresos, previsiones, costes y rentabilidad.", to: "/finance", icon: LineChart },
  { title: "Plan de facturación", description: "Importes, fechas y seguimiento de las facturas previstas.", to: "/billing", icon: Receipt },
  { title: "Comisión por proyecto", description: "Cuánto se ha facturado de cada proyecto y cuánto falta para completar la comisión IC.", to: "/comisiones-proyecto", icon: Gauge },
  { title: "Presupuestos", description: "Presupuestos creados y vinculados a cada proyecto.", to: "/paperwork/presupuestos", icon: FileText },
];

function EconomicoIC() {
  return <SectionLanding eyebrow="Dirección" title="Económico IC" description="Elige el área económica en la que quieres trabajar." doors={DOORS} />;
}