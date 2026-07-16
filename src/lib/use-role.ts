// Política de usuarios: docs/POLITICA_USUARIOS.md
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "admin" | "team" | "composer";
export type ProfileStatus = "pending" | "active" | "rejected";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "BIG C",
  team: "TEAM",
  composer: "ROSTER",
};

export function useCurrentRole() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<{
      role: AppRole | null;
      composer_id: string | null;
      status: ProfileStatus;
    }> => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase
          .from("profiles")
          .select("composer_id, status")
          .eq("id", user!.id)
          .maybeSingle(),
      ]);
      const r = (roles?.map((x) => x.role as AppRole) ?? []);
      const role: AppRole | null = r.includes("admin")
        ? "admin"
        : r.includes("team")
        ? "team"
        : r.includes("composer")
        ? "composer"
        : null;
      return {
        role,
        composer_id: (profile?.composer_id as string | null) ?? null,
        status: ((profile?.status as ProfileStatus | undefined) ?? "pending"),
      };
    },
  });
  return {
    role: data?.role ?? null,
    composerId: data?.composer_id ?? null,
    status: data?.status ?? "pending",
    isBigC: data?.role === "admin",
    isTeam: data?.role === "team",
    isStaff: data?.role === "admin" || data?.role === "team",
    loading: authLoading || isLoading,
  };
}