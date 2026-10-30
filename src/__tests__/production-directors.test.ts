import { describe, expect, test } from "bun:test";
import { additionalDirectors, directorsToAdd, isDirectorLinked } from "@/lib/production-directors";

const links = [
  { id: "l1", director_id: "d1", name: "Agnès Varda", is_primary: true },
  { id: "l2", director_id: "d2", name: "Isaki Lacuesta", is_primary: false },
  { id: "l3", director_id: "d3", name: "arantxa Etxebarria", is_primary: false },
  { id: "l4", director_id: "d2", name: "Isaki Lacuesta", is_primary: false },
];

describe("direcciones adicionales de una producción", () => {
  test("la principal cuenta como vinculada aunque no esté en la lista", () => {
    expect(isDirectorLinked("d1", [], "d1")).toBe(true);
    expect(isDirectorLinked("d9", links, "d1")).toBe(false);
    expect(isDirectorLinked("d2", links, "d1")).toBe(true);
  });

  test("las adicionales excluyen la principal y los duplicados, y se ordenan por nombre", () => {
    expect(additionalDirectors(links, "d1").map((l) => l.director_id)).toEqual(["d3", "d2"]);
  });

  test("sin dirección principal, todas las vinculadas cuentan", () => {
    expect(additionalDirectors(links, null).map((l) => l.director_id)).toEqual(["d3", "d1", "d2"]);
  });

  test("el selector solo ofrece direcciones que aún no están en la ficha", () => {
    const all = [
      { id: "d1", name: "Agnès Varda" },
      { id: "d2", name: "Isaki Lacuesta" },
      { id: "d4", name: "Claire Simon" },
    ];
    expect(directorsToAdd(all, links, "d1").map((d) => d.id)).toEqual(["d4"]);
  });
});
