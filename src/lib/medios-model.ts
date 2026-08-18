export const MEDIO_TIPOS = ["Prensa escrita", "Medio digital", "Radio", "Cadena de televisión", "Revista"] as const;
export type MedioTipo = (typeof MEDIO_TIPOS)[number];
