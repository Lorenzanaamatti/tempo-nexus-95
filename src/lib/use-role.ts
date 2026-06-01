import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "admin" | "composer";

export function useCurrentRole() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<{ role: AppRole | null; composer_id: string | null }> => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("profiles").select("composer_id").eq("id", user!.id).maybeSingle(),
      ]);
      const r = roles?.map((x) => x.role as AppRole) ?? [];
      const role: AppRole | null = r.includes("admin") ? "admin" : r.includes("composer") ? "composer" : null;
      return { role, composer_id: (profile?.composer_id as string | null) ?? null };
    },
  });
  return {
    role: data?.role ?? null,
    composerId: data?.composer_id ?? null,
    loading: authLoading || isLoading,
  };
}