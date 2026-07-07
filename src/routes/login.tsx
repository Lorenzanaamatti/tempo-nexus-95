import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) window.location.replace("/");
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setLoading(false);
    if (error) toast.error(error.message);
    else if (mode === "signup") toast.success("Revisa tu correo para confirmar.");
  };

  const onGoogle = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("No se pudo iniciar sesión con Google");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-display text-4xl">INTERESANTE COMPAÑIA</h1>
          <p className="mt-2 smallcaps text-muted-foreground">Herramienta de gestión integral</p>
          <p className="mt-3 text-sm text-muted-foreground">Acceso restringido al equipo y a los compositores representados.</p>
        </div>
        <div className="glass-panel rounded-sm p-6">
          <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 rounded-sm px-3 py-1.5 transition ${mode === m ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "signin" ? "Entrar" : "Crear cuenta"}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "…" : mode === "signin" ? "Entrar" : "Crear cuenta"}</Button>
          </form>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" /></div>
          <Button variant="outline" className="w-full" onClick={onGoogle}>Continuar con Google</Button>
        </div>
      </div>
    </div>
  );
}