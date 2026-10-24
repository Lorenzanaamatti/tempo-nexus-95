import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useMyOnboardingProgress } from "@/lib/onboarding";

export function OnboardingInvite() {
  const { user } = useAuth();
  const { data, isFetched } = useMyOnboardingProgress(user?.id);
  if (!isFetched || data?.completed_at) return null;
  return (
    <div className="border-b border-border bg-accent px-5 py-3 text-center text-sm">
      <span className="font-semibold text-aubergine">Benvinguda! </span>
      <span className="text-muted-foreground">Tens pendent l’onboarding de l’empresa. </span>
      <Link to="/recursos/onboarding" className="font-bold text-rust underline underline-offset-4">
        {data?.last_position ? "Continuar" : "Començar"}
      </Link>
    </div>
  );
}
