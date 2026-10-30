import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Autoguardado de fichas: 1 segundo después del último cambio hecho por la
 * persona (teclado/ratón), llama a `save` sin mostrar el aviso de «Guardado».
 * Los cambios que llegan al cargar o recargar datos no disparan guardado.
 */
export function useAutosave(value: unknown, save: () => unknown, delayMs = 1000) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const baseline = useRef<string | null>(null);
  const interacted = useRef(false);
  const busy = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    const mark = () => { interacted.current = true; };
    document.addEventListener("keydown", mark, true);
    document.addEventListener("pointerdown", mark, true);
    return () => {
      document.removeEventListener("keydown", mark, true);
      document.removeEventListener("pointerdown", mark, true);
    };
  }, []);

  let snapshot: string;
  try { snapshot = JSON.stringify(value, (_k, v) => (v instanceof Set ? [...v] : v)) ?? ""; }
  catch { snapshot = ""; }

  useEffect(() => {
    if (value == null) return;
    if (baseline.current === null || !interacted.current) {
      baseline.current = snapshot;
      return;
    }
    if (snapshot === baseline.current) return;
    const t = setTimeout(async function run() {
      if (busy.current) { pending.current = true; return; }
      busy.current = true;
      baseline.current = snapshot;
      const original = toast.success;
      (toast as any).success = () => "";
      try { await saveRef.current(); }
      finally {
        (toast as any).success = original;
        busy.current = false;
        if (pending.current) { pending.current = false; setTimeout(run, delayMs); }
      }
    }, delayMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);
}
