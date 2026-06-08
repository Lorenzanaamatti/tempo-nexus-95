import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

const KEY = "portal-preview-composer-id";

/**
 * Resuelve el composer del que se está viendo el portal.
 * - Si el usuario logueado es un compositor, se usa su propio composer_id.
 * - Si es admin (no tiene composer_id), se permite previsualizar el portal de
 *   cualquier representado mediante un selector. La selección se persiste en
 *   localStorage para que se mantenga entre páginas.
 */
export function usePortalComposer() {
  const { role, composerId: ownId, loading } = useCurrentRole();
  const isAdmin = role === "admin";

  // Permite forzar el composer a previsualizar vía ?as=<id> en la URL.
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const asParam = typeof search?.as === "string" ? (search.as as string) : null;

  const [previewId, setPreviewId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(KEY);
  });

  // Si llega ?as=<id>, sincroniza la selección persistida.
  useEffect(() => {
    if (!isAdmin || !asParam) return;
    if (asParam === previewId) return;
    window.localStorage.setItem(KEY, asParam);
    setPreviewId(asParam);
  }, [isAdmin, asParam, previewId]);

  const composersQ = useQuery({
    queryKey: ["portal-preview-composers"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("composers")
        .select("id, full_name, artistic_name")
        .order("full_name");
      return data ?? [];
    },
  });

  // Si admin y no hay preview seleccionado, escoge el primero por defecto.
  useEffect(() => {
    if (!isAdmin) return;
    if (previewId) return;
    const first = composersQ.data?.[0]?.id;
    if (first) {
      window.localStorage.setItem(KEY, first);
      setPreviewId(first);
    }
  }, [isAdmin, previewId, composersQ.data]);

  function selectPreview(id: string) {
    window.localStorage.setItem(KEY, id);
    setPreviewId(id);
  }

  const composerId = isAdmin ? (asParam || previewId) : ownId;

  return {
    composerId,
    loading,
    isAdmin,
    previewComposers: composersQ.data ?? [],
    selectPreview,
  };
}