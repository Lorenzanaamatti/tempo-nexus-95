import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "ic-theme";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(KEY) as ThemeMode | null) ?? "system";
  });
  // Track whether the latest setMode came from a remote pull, so we don't
  // echo it back as a write.
  const skipNextPushRef = useRef(false);
  const lastPushedRef = useRef<ThemeMode | null>(null);
  // Once the user explicitly toggles the theme in this tab, ignore any
  // remote pulls that arrive late (they would race and revert the choice).
  const userTouchedRef = useRef(false);

  useEffect(() => {
    applyTheme(mode);
    try { localStorage.setItem(KEY, mode); } catch {}
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  // Sync with profile: on auth load, adopt remote preference if it differs;
  // also push local changes back to the profile so other devices follow.
  useEffect(() => {
    let cancelled = false;
    let currentUserId: string | null = null;

    const pullRemote = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("theme_preference")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      // If the user already toggled in this tab, do not override their choice
      // with a (possibly stale) remote value. The push effect will sync it.
      if (userTouchedRef.current) return;
      const remote = (data?.theme_preference as ThemeMode | null) ?? null;
      if (remote && remote !== mode) {
        skipNextPushRef.current = true;
        lastPushedRef.current = remote;
        setMode(remote);
      } else if (!remote) {
        // No remote yet → seed from current local preference.
        await supabase.from("profiles").update({ theme_preference: mode }).eq("id", userId);
        lastPushedRef.current = mode;
      } else {
        lastPushedRef.current = remote;
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      currentUserId = data.user?.id ?? null;
      if (currentUserId) pullRemote(currentUserId);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      if (uid && uid !== currentUserId) {
        currentUserId = uid;
        pullRemote(uid);
      } else if (!uid) {
        currentUserId = null;
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push local changes to the profile (fire-and-forget).
  useEffect(() => {
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (lastPushedRef.current === mode) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      lastPushedRef.current = mode;
      supabase.from("profiles").update({ theme_preference: mode }).eq("id", uid);
    });
    return () => { cancelled = true; };
  }, [mode]);

  const cycle = useCallback(() => {
    userTouchedRef.current = true;
    setMode((m) => (m === "light" ? "dark" : m === "dark" ? "system" : "light"));
  }, []);

  const setModeExplicit = useCallback((next: ThemeMode) => {
    userTouchedRef.current = true;
    setMode(next);
  }, []);

  return { mode, setMode: setModeExplicit, cycle, resolved: resolveTheme(mode) };
}