import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { OPPORTUNITY_KIND_LABEL } from "@/lib/opportunity-constants";

const detailFile = readFileSync(
  join(import.meta.dir, "../routes/_authenticated/_admin/opportunities.$opportunityId.tsx"),
  "utf8",
);

describe("Opportunity kind dropdown (ficha de oportunidad)", () => {
  test("excluye 'fichaje_productora' del select de tipo", () => {
    // El select itera sobre OPPORTUNITY_KIND_LABEL pero debe filtrar
    // explícitamente 'fichaje_productora' (se crea automáticamente desde
    // cuentas objetivo, no debe ofrecerse manualmente).
    const filterPattern = /\.filter\(\([^)]*\)\s*=>\s*\w+\s*!==\s*["']fichaje_productora["']\)/;
    expect(detailFile).toMatch(filterPattern);
  });

  test("el filtro se aplica antes del .map que genera <SelectItem>", () => {
    const idx = detailFile.indexOf("OPPORTUNITY_KIND_LABEL) as OpportunityKind[]");
    expect(idx).toBeGreaterThan(-1);
    const slice = detailFile.slice(idx, idx + 400);
    expect(slice).toContain('!== "fichaje_productora"');
    expect(slice.indexOf("!==")).toBeLessThan(slice.indexOf(".map("));
  });

  test("'fichaje_productora' sigue existiendo en el enum (para badges/lecturas)", () => {
    expect(OPPORTUNITY_KIND_LABEL).toHaveProperty("fichaje_productora");
  });
});