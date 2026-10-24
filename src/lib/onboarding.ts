import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** design: imagen del diseño original de la diapositiva (se muestra a pantalla completa). */
/** box: posición original sobre el diseño (fracciones 0-1 del ancho/alto). */
export type OnboardingMedia = {
  url?: string;
  path?: string;
  kind: "image" | "video";
  design?: boolean;
  box?: { x: number; y: number; w: number; h: number; z?: number };
};
export type OnboardingSlide = {
  id: string;
  position: number;
  chapter: string;
  title: string;
  body: string;
  media: OnboardingMedia[];
};

export const ONBOARDING_BUCKET = "onboarding-media";

export function useOnboardingSlides() {
  return useQuery({
    queryKey: ["onboarding-slides"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<OnboardingSlide[]> => {
      const { data, error } = await supabase
        .from("onboarding_slides")
        .select("id, position, chapter, title, body, media")
        .order("position");
      if (error) throw error;
      return (data ?? []).map((s) => ({ ...s, media: (s.media as OnboardingMedia[]) ?? [] }));
    },
  });
}

export function useMyOnboardingProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_progress")
        .select("last_position, completed_at")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });
}

export async function saveOnboardingProgress(userId: string, lastPosition: number, completed: boolean) {
  const row: { user_id: string; last_position: number; updated_at: string; completed_at?: string } = {
    user_id: userId,
    last_position: lastPosition,
    updated_at: new Date().toISOString(),
  };
  if (completed) row.completed_at = new Date().toISOString();
  await supabase.from("onboarding_progress").upsert(row, { onConflict: "user_id" });
}

/** Devuelve una URL visible para un medio: directa o firmada si está en el almacén privado. */
export function useMediaUrl(m: OnboardingMedia) {
  const [url, setUrl] = useState<string | undefined>(m.url);
  useEffect(() => {
    if (m.url) {
      setUrl(m.url);
      return;
    }
    if (!m.path) return;
    let alive = true;
    supabase.storage
      .from(ONBOARDING_BUCKET)
      .createSignedUrl(m.path, 60 * 60)
      .then(({ data }) => alive && setUrl(data?.signedUrl));
    return () => {
      alive = false;
    };
  }, [m.url, m.path]);
  return url;
}
