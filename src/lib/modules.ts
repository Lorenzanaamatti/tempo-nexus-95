import { useSyncExternalStore } from "react";

/**
 * Módulos opcionales del back-office.
 * Permite "aparcar" secciones sin uso para aligerar el árbol de navegación.
 * No borra datos: las rutas siguen accesibles por URL directa.
 */
export const OPTIONAL_MODULES = [
  { key: "providers",    label: "Proveedores",      hint: "Catálogo de proveedores externos" },
  { key: "press-kits",   label: "Press kits",       hint: "Dosieres de prensa por compositor" },
  { key: "case-studies", label: "Casos de éxito",   hint: "Historias de proyectos destacados" },
  { key: "clippings",    label: "Clipping",         hint: "Recortes y menciones en prensa" },
  { key: "templates",    label: "Plantillas mail",  hint: "Plantillas de contacto comercial" },
] as const;

export type ModuleKey = (typeof OPTIONAL_MODULES)[number]["key"];

/** Módulos ocultos por defecto (sin contenido en la base hoy). */
const DEFAULT_HIDDEN: ModuleKey[] = ["providers", "press-kits", "case-studies", "clippings"];

const KEY = "ic:enabled-modules";
const EVT = "ic:enabled-modules:change";

function read(): ModuleKey[] {
  if (typeof window === "undefined") return defaults();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return defaults();
  try {
    const parsed = JSON.parse(raw) as string[];
    return OPTIONAL_MODULES.map((m) => m.key).filter((k) => parsed.includes(k));
  } catch {
    return defaults();
  }
}

function defaults(): ModuleKey[] {
  return OPTIONAL_MODULES.map((m) => m.key).filter((k) => !DEFAULT_HIDDEN.includes(k));
}

let cache: ModuleKey[] | null = null;
let cacheRaw: string | null = null;

function readCached(): ModuleKey[] {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  if (cache && raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = read();
  return cache;
}

const SERVER_SNAPSHOT = defaults();

export function setEnabledModules(keys: ModuleKey[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(keys));
  window.dispatchEvent(new Event(EVT));
}

export function toggleModule(key: ModuleKey, on: boolean) {
  const current = readCached();
  setEnabledModules(on ? [...new Set([...current, key])] : current.filter((k) => k !== key));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useEnabledModules(): ModuleKey[] {
  return useSyncExternalStore(subscribe, readCached, () => SERVER_SNAPSHOT);
}

/** Ruta → módulo opcional al que pertenece (si aplica). */
export const MODULE_BY_PATH: Record<string, ModuleKey> = {
  "/providers": "providers",
  "/marketing/press-kits": "press-kits",
  "/marketing/case-studies": "case-studies",
  "/marketing/clippings": "clippings",
  "/marketing/templates": "templates",
};

export function isPathEnabled(path: string, enabled: ModuleKey[]) {
  const mod = MODULE_BY_PATH[path];
  return !mod || enabled.includes(mod);
}
