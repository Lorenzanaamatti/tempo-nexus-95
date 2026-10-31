import { describe, it, expect } from "vitest";
import { splitCompanyNames } from "@/lib/split-companies";

describe("splitCompanyNames", () => {
  it("separa por comas e «y»", () => {
    expect(splitCompanyNames("Bowfinger, Vaca Films, Esto también pasará, Telecinco Cinema y Pampa Films").companies).toEqual([
      "Bowfinger", "Vaca Films", "Esto también pasará", "Telecinco Cinema", "Pampa Films",
    ]);
  });
  it("separa barras y extrae la plataforma entre paréntesis", () => {
    expect(splitCompanyNames("Fudge Park / Banijay (Netflix)")).toEqual({ companies: ["Fudge Park", "Banijay"], platforms: ["Netflix"] });
  });
  it("descarta notas entre paréntesis que no son plataforma", () => {
    expect(splitCompanyNames("Two Brothers Pictures (The Tourist, Fleabag) + All3Media International").companies).toEqual([
      "Two Brothers Pictures", "All3Media International",
    ]);
  });
  it("una sola productora queda igual", () => {
    expect(splitCompanyNames("Morena Films").companies).toEqual(["Morena Films"]);
  });
});
