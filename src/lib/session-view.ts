import { useSyncExternalStore } from "react";

export type SessionView = "bigc" | "team" | "roster";

export const SESSION_VIEW_LABEL: Record<SessionView, string> = {
  bigc: "BIG C",
  team: "TEAM",
  roster: "ROSTER",
};

const KEY = "ic:session-view";
const EVT = "ic:session-view:change";

function read(): SessionView | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "bigc" || v === "team" || v === "roster" ? v : null;
}

export function setSessionView(v: SessionView | null) {
  if (typeof window === "undefined") return;
  if (v === null) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, v);
  window.dispatchEvent(new Event(EVT));
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

export function useSessionView(): SessionView | null {
  return useSyncExternalStore(subscribe, read, () => null);
}