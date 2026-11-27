import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

/** Registra cada página abierta por la persona con sesión y el tiempo que la tiene visible. */
export function usePageVisitTracker() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!user) return;
    let id: string | null = null;
    let visibleMs = 0;
    let since: number | null = document.visibilityState === "visible" ? Date.now() : null;
    let cancelled = false;

    const seconds = () => Math.round((visibleMs + (since ? Date.now() - since : 0)) / 1000);
    const flush = () => {
      if (!id) return;
      void supabase.from("app_page_visits").update({ duration_seconds: seconds() }).eq("id", id);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (since) visibleMs += Date.now() - since;
        since = null;
        flush();
      } else since = Date.now();
    };

    void supabase
      .from("app_page_visits")
      .insert({ user_id: user.id, email: user.email ?? null, path: pathname })
      .select("id")
      .single()
      .then(({ data }) => {
        if (!cancelled) id = data?.id ?? null;
        else if (data?.id) {
          id = data.id;
          flush();
        }
      });

    const timer = window.setInterval(flush, 30000);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [user, pathname]);
}
