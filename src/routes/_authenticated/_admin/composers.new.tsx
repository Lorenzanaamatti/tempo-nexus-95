import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify } from "@/lib/composers-api";
import { toast } from "sonner";

type RosterRole = "composer" | "artist" | "supervisor" | "specialist" | "curator" | "other";
const ROLE_LABEL: Record<RosterRole, string> = {
  composer: "Compositor",
  artist: "Artista",
  supervisor: "Supervisor musical",
  specialist: "Especialista",
  curator: "Curador musical",
  other: "Otros",
};
const ROLES = Object.keys(ROLE_LABEL) as RosterRole[];

export const Route = createFileRoute("/_authenticated/_admin/composers/new")({
  component: NewComposerPage,
  validateSearch: (s: Record<string, unknown>): { role: RosterRole } => {
    const v = typeof s.role === "string" ? s.role : "composer";
    return { role: (ROLES.includes(v as RosterRole) ? v : "composer") as RosterRole };
  },
});

function NewComposerPage() {
  const navigate = useNavigate();
  const { role: initialRole } = Route.useSearch() as { role: RosterRole };
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RosterRole>(initialRole);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setBusy(true);
    const slug = slugify(fullName) || crypto.randomUUID().slice(0, 8);
    const { data, error } = await supabase
      .from("composers")
      .insert({
        full_name: fullName.trim(),
        slug,
        roster_role: role,
        owner_email: ownerEmail.trim() || null,
        bio_short: bioShort.trim() || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ficha creada");
    navigate({ to: "/composers/$composerId", params: { composerId: data!.id } });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="smallcaps text-muted-foreground">
        <Link to="/composers" search={{ role: initialRole }} className="hover:text-foreground">Roster</Link> · Nueva ficha
      </p>
      <h1 className="mt-2 font-display text-4xl italic">Añadir {ROLE_LABEL[role].toLowerCase()}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Empieza con lo mínimo. Podrás completar bio, demos, filmografía y premios después.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo *</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label>Rol en el roster *</Label>
          <Select value={role} onValueChange={(v) => setRole(v as RosterRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerEmail">Email (opcional)</Label>
          <Input id="ownerEmail" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="Para vincular su acceso al iniciar sesión" maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bioShort">Bio breve (opcional)</Label>
          <Textarea id="bioShort" value={bioShort} onChange={(e) => setBioShort(e.target.value)} maxLength={300} rows={3} />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={busy}>{busy ? "Creando…" : "Crear ficha"}</Button>
          <Button asChild type="button" variant="ghost"><Link to="/composers" search={{ role: initialRole }}>Cancelar</Link></Button>
        </div>
      </form>
    </div>
  );
}