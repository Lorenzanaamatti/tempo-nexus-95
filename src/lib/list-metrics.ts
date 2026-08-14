/**
 * Métricas de latencia de las listas paginadas en servidor.
 * Único sitio donde se registran los tiempos de consulta: `useServerPagination`
 * llama a `recordListLatency` automáticamente al resolverse cada query.
 */
export type ListLatencySample = {
  list: string;
  ms: number;
  at: number;
  sortKey: string;
  sortDir: string;
  page: number;
};

const MAX_SAMPLES = 100;
const samples: ListLatencySample[] = [];
const listeners = new Set<(s: ListLatencySample) => void>();

export function recordListLatency(sample: ListLatencySample) {
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
  for (const l of listeners) l(sample);
  if (typeof window !== "undefined") {
    (window as any).__listMetrics = getListMetrics;
    if (sample.ms > 1500) {
      // eslint-disable-next-line no-console
      console.warn(`[list-metrics] ${sample.list} tardó ${Math.round(sample.ms)} ms`, sample);
    }
  }
}

export function onListLatency(fn: (s: ListLatencySample) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getListSamples(list?: string) {
  return list ? samples.filter((s) => s.list === list) : [...samples];
}

/** Resumen agregado por lista: nº de consultas, media, p95 y máximo (ms). */
export function getListMetrics() {
  const byList = new Map<string, number[]>();
  for (const s of samples) {
    const arr = byList.get(s.list) ?? [];
    arr.push(s.ms);
    byList.set(s.list, arr);
  }
  return [...byList.entries()].map(([list, ms]) => {
    const sorted = [...ms].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    return {
      list,
      count: sorted.length,
      avgMs: Math.round(avg),
      p95Ms: Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!),
      maxMs: Math.round(sorted[sorted.length - 1]!),
    };
  });
}

export function resetListMetrics() {
  samples.length = 0;
}
