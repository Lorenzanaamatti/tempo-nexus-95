import { SectionDoors, type Door } from "@/components/section-doors";

/** Puertas de navegación entre las vistas de Fichajes que queremos. */
export function FichajesDoors({ selected }: { selected: "roster" | "prospects" }) {
  const doors: Door[] = [
    { title: "Composers ESP", to: "/oportunidades/roster", selected: selected === "roster" },
    { title: "Quiero fichar a", to: "/oportunidades/prospects-fichaje", selected: selected === "prospects" },
  ];
  return <SectionDoors doors={doors} columns={2} />;
}
