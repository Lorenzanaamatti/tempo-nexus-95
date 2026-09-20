import { SectionDoors, type Door } from "@/components/section-doors";
import type { RosterRoleValue } from "@/lib/roster-roles";

type RosterDoor = RosterRoleValue | "complete";

const ROSTER_MARKERS: Record<RosterRoleValue, string> = {
  composer: "bg-chart-1",
  artist: "bg-chart-2",
  supervisor: "bg-chart-3",
  specialist: "bg-chart-4",
  curator: "bg-chart-5",
  productor_musical: "bg-destructive",
  other: "bg-foreground",
};

const ROSTER_DOORS: Array<{ key: RosterDoor; title: string; to: string; role?: RosterRoleValue }> = [
  { key: "complete", title: "Roster completo", to: "/roster" },
  { key: "composer", title: "Compositores", to: "/composers", role: "composer" },
  { key: "artist", title: "Artistas", to: "/composers", role: "artist" },
  { key: "curator", title: "Music Curators", to: "/composers", role: "curator" },
  { key: "supervisor", title: "Supervisores musicales", to: "/composers", role: "supervisor" },
  { key: "productor_musical", title: "Productores musicales", to: "/composers", role: "productor_musical" },
  { key: "specialist", title: "Especialistas", to: "/composers", role: "specialist" },
  { key: "other", title: "Otros perfiles", to: "/composers", role: "other" },
];

export function RosterDoors({ selected }: { selected: RosterDoor }) {
  const doors: Door[] = ROSTER_DOORS.map((door) => ({
    title: door.title,
    to: door.to,
    search: door.role ? { role: door.role } : undefined,
    selected: selected === door.key,
    markerClass: door.role ? ROSTER_MARKERS[door.role] : undefined,
  }));

  return <SectionDoors doors={doors} columns={3} />;
}