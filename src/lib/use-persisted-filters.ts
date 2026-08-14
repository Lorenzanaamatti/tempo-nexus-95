import { useEffect, useState } from "react";

/**
 * Filtros que se recuerdan entre visitas (Roster, Cuentas objetivo, Candidaturas…).
 * Se guardan en localStorage; la lectura ocurre tras la hidratación para evitar
 * discrepancias entre servidor y cliente.
 */
export function usePersistedFilters<T extends Record<string, unknown>>(key: string, initial: T) {
  const [filters, setFilters] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`ic.filters.${key}`);
      if (raw) setFilters({ ...initial, ...(JSON.parse(raw) as Partial<T>) });
    } catch { /* almacenamiento no disponible */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(`ic.filters.${key}`, JSON.stringify(filters));
    } catch { /* almacenamiento no disponible */ }
  }, [key, filters, hydrated]);

  const setFilter = <K extends keyof T>(name: K, value: T[K]) =>
    setFilters((f) => ({ ...f, [name]: value }));

  const reset = () => setFilters(initial);

  return { filters, setFilter, setFilters, reset, hydrated };
}

/** Variante de `useState` cuyo valor se recuerda entre visitas. */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`ic.filter.${key}`);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch { /* almacenamiento no disponible */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(`ic.filter.${key}`, JSON.stringify(value));
    } catch { /* almacenamiento no disponible */ }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}
