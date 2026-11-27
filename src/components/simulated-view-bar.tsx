import { useNavigate } from "@tanstack/react-router";
import { useCurrentRole } from "@/lib/use-role";
import { setSessionView, SESSION_VIEW_LABEL } from "@/lib/session-view";
import { usePortalComposer } from "@/lib/use-portal-composer";

/** Barra fija que avisa a BIG C de que está simulando otra vista y permite volver. */
export function SimulatedViewBar() {
  const { isSimulating, role } = useCurrentRole();
  const nav = useNavigate();
  if (!isSimulating) return null;
  const isRoster = role === "composer";
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-[color:var(--aubergine)] px-4 py-2 text-sm text-white">
      <span>
        Estás viendo la app como <strong>{SESSION_VIEW_LABEL[isRoster ? "roster" : "team"]}</strong>
      </span>
      {isRoster && <RosterPicker />}
      <button
        type="button"
        onClick={() => {
          setSessionView("bigc");
          nav({ to: "/" });
        }}
        className="rounded-full border border-white/60 px-3 py-0.5 font-semibold hover:bg-white/10"
      >
        Volver a BIG C
      </button>
    </div>
  );
}

function RosterPicker() {
  const { composerId, previewComposers, selectPreview } = usePortalComposer();
  const nav = useNavigate();
  return (
    <label className="flex items-center gap-2">
      <span>Artista:</span>
      <select
        aria-label="Artista simulado"
        value={composerId ?? ""}
        onChange={(e) => {
          selectPreview(e.target.value);
          nav({ to: "/portal" });
        }}
        className="max-w-56 rounded-sm bg-white px-2 py-0.5 text-[color:var(--aubergine)]"
      >
        {previewComposers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.artistic_name || c.full_name}
          </option>
        ))}
      </select>
    </label>
  );
}
