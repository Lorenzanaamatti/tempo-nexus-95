import { describe, expect, test } from "bun:test";
import { additionalCompanies, companiesToAdd, isCompanyLinked } from "@/lib/production-companies";

const links = [
  { id: "l1", company_id: "c1", name: "Álvaro Productora", is_primary: true },
  { id: "l2", company_id: "c2", name: "Banda Films", is_primary: false },
  { id: "l3", company_id: "c3", name: "acme Films", is_primary: false },
  { id: "l4", company_id: "c2", name: "Banda Films", is_primary: false },
];

describe("productoras adicionales de una producción", () => {
  test("la principal cuenta como vinculada aunque no esté en la lista", () => {
    expect(isCompanyLinked("c1", [], "c1")).toBe(true);
    expect(isCompanyLinked("c9", links, "c1")).toBe(false);
    expect(isCompanyLinked("c2", links, "c1")).toBe(true);
  });

  test("las adicionales excluyen la principal y los duplicados, y se ordenan por nombre", () => {
    expect(additionalCompanies(links, "c1").map((l) => l.company_id)).toEqual(["c3", "c2"]);
  });

  test("sin productora principal, todas las vinculadas cuentan", () => {
    expect(additionalCompanies(links, null).map((l) => l.company_id)).toEqual(["c3", "c1", "c2"]);
  });

  test("el selector solo ofrece productoras que aún no están en la ficha", () => {
    const all = [
      { id: "c1", name: "Álvaro Productora" },
      { id: "c2", name: "Banda Films" },
      { id: "c4", name: "Delta Cine" },
    ];
    expect(companiesToAdd(all, links, "c1").map((c) => c.id)).toEqual(["c4"]);
  });
});
