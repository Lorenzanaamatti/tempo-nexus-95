import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Detecta cambios sin guardar en un formulario controlado.
 * Llama a `markClean(valor)` justo después de hidratar el formulario con los
 * datos del servidor y después de cada guardado correcto.
 * Mientras haya cambios pendientes, avisa si se intenta cerrar la pestaña.
 */
export function useDirtyForm<T>(value: T) {
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(value));
  const valueRef = useRef(value);
  valueRef.current = value;

  const dirty = JSON.stringify(value) !== baseline;

  const markClean = useCallback((v?: T) => {
    setBaseline(JSON.stringify(v === undefined ? valueRef.current : v));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return { dirty, markClean };
}
