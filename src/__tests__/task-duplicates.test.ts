import { describe, it, expect } from "vitest";
import { findDuplicatePairs, pairKey } from "@/lib/task-duplicates";

describe("detector de duplicados de tareas", () => {
  it("detecta mismo título con distinto acento/mayúsculas", () => {
    const p = findDuplicatePairs([
      { id: "1", title: "Enviar contrato a Filmax" },
      { id: "2", title: "enviar CONTRATO a filmax" },
    ]);
    expect(p).toHaveLength(1);
  });
  it("detecta mismo contexto (cliente) con redacción parecida", () => {
    const p = findDuplicatePairs([
      { id: "1", title: "Llamar productora para presupuesto música", client: "Filmax" },
      { id: "2", title: "Llamar productora presupuesto", client: "filmax" },
    ]);
    expect(p).toHaveLength(1);
  });
  it("no marca tareas de clientes distintos", () => {
    const p = findDuplicatePairs([
      { id: "1", title: "Enviar factura de agosto", client: "Filmax" },
      { id: "2", title: "Enviar factura septiembre", client: "Bambú" },
    ]);
    expect(p).toHaveLength(0);
  });
  it("ignora tareas hechas y pares descartados", () => {
    expect(findDuplicatePairs([{ id: "1", title: "Revisar deal memo" }, { id: "2", title: "Revisar deal memo", done: true }])).toHaveLength(0);
    expect(findDuplicatePairs([{ id: "1", title: "Revisar deal memo" }, { id: "2", title: "Revisar deal memo" }], new Set([pairKey("2", "1")]))).toHaveLength(0);
  });
});
