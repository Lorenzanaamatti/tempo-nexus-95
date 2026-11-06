import { describe, it, expect } from "bun:test";
import { filterProductionsByTitle, normalizeText } from "@/lib/production-search";

const PRODUCTIONS = [
  { id: "1", title: "La Maleta" },
  { id: "2", title: "La maleta" },
  { id: "3", title: "La Maleta de Alex" },
  { id: "4", title: "LONGQUAN" },
  { id: "5", title: "Aquí y ahora" },
];

describe("búsqueda de producción en el desplegable de tareas", () => {
  it("ignora mayúsculas y tildes", () => {
    expect(filterProductionsByTitle(PRODUCTIONS, "aqui y ahora").map((p) => p.id)).toEqual(["5"]);
    expect(filterProductionsByTitle(PRODUCTIONS, "LA MALETA").map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
  it("tolera espacios de más entre palabras", () => {
    expect(filterProductionsByTitle(PRODUCTIONS, "LA  MALETA").map((p) => p.id)).toEqual(["1", "2", "3"]);
  });
  it("exige que todas las palabras aparezcan en el título", () => {
    expect(filterProductionsByTitle(PRODUCTIONS, "maleta alex").map((p) => p.id)).toEqual(["3"]);
    expect(filterProductionsByTitle(PRODUCTIONS, "maleta longquan")).toEqual([]);
  });
  it("con la búsqueda vacía devuelve todas, ordenadas por título", () => {
    const all = filterProductionsByTitle(PRODUCTIONS, "");
    expect(all).toHaveLength(5);
    expect(all[0].title).toBe("Aquí y ahora");
  });
  it("normaliza tildes y mayúsculas", () => {
    expect(normalizeText("MÚSICA  Española")).toBe("musica  espanola");
  });
});
