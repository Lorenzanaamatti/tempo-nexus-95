export const MEDIO_FORMATOS = [
  "Prensa escrita",
  "Revista",
  "Medio digital",
  "Radio",
  "Cadena de televisión",
  "Podcast",
] as const;
export type MedioFormato = (typeof MEDIO_FORMATOS)[number];

export const MEDIO_ESPECIALIDADES = [
  "Generalista",
  "Cultura",
  "Cine",
  "Música",
  "Series / TV",
  "Industria audiovisual",
] as const;
export type MedioEspecialidad = (typeof MEDIO_ESPECIALIDADES)[number];

export const MEDIO_AMBITOS = ["España", "Internacional", "Ambos"] as const;
export type MedioAmbito = (typeof MEDIO_AMBITOS)[number];
