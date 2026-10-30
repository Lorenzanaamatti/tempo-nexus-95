import { describe, expect, test } from "bun:test";
import { byTitleEs } from "@/lib/production-sort";

const titles = (rows: { title: string | null | undefined; year?: number | null }[]) =>
  [...rows].sort(byTitleEs).map((r) => r.title);

describe("orden alfabético de producciones por título", () => {
  test("ordena A → Z respetando acentos y la ñ", () => {
    expect(
      titles([
        { title: "Zona de riesgo" },
        { title: "Ángel de la guarda" },
        { title: "Ñora" },
        { title: "Nocturno" },
        { title: "Éste es Nacho" },
      ]),
    ).toEqual(["Ángel de la guarda", "Éste es Nacho", "Nocturno", "Ñora", "Zona de riesgo"]);
  });

  test("ignora mayúsculas y minúsculas al comparar", () => {
    expect(titles([{ title: "zeta" }, { title: "Alfa" }, { title: "Bosque" }])).toEqual(["Alfa", "Bosque", "zeta"]);
  });

  test("los títulos vacíos van al final", () => {
    expect(titles([{ title: "" }, { title: null }, { title: "Alfa" }])).toEqual(["Alfa", "", null]);
  });

  test("empate de título se resuelve por año", () => {
    expect(
      titles([
        { title: "La isla", year: 2024 },
        { title: "La isla", year: 2021 },
      ]),
    ).toEqual(["La isla", "La isla"]);
    const sorted = [{ title: "La isla", year: 2024 }, { title: "La isla", year: 2021 }].sort(byTitleEs);
    expect(sorted.map((r) => r.year)).toEqual([2021, 2024]);
  });
});
