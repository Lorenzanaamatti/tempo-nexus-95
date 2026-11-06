import { describe, it, expect } from "bun:test";
import { PITCH_ESTADOS, PITCH_ESTADO_CLASS, PITCH_ESTADOS_ABIERTOS } from "@/lib/pitches";

describe("estados de pitch", () => {
  it("ofrece Descartado como opción", () => {
    expect(PITCH_ESTADOS).toContain("Descartado");
    expect(PITCH_ESTADO_CLASS["Descartado"]).toBeTruthy();
  });
  it("Descartado no cuenta como pitch abierto", () => {
    expect(PITCH_ESTADOS_ABIERTOS).not.toContain("Descartado");
  });
});
