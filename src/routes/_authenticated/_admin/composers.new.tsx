import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/composers-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/composers/new")({
  component: NewComposerPage,
});

function NewComposerPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
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
        <Link to="/composers" className="hover:text-foreground">Roster</Link> · Nueva ficha
      </p>
      <h1 className="mt-2 font-display text-4xl italic">Añadir compositor</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Empieza con lo mínimo. Podrás completar bio, demos, filmografía y premios después.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo *</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerEmail">Email del compositor (opcional)</Label>
          <Input id="ownerEmail" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="Para vincular su acceso al iniciar sesión" maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bioShort">Bio breve (opcional)</Label>
          <Textarea id="bioShort" value={bioShort} onChange={(e) => setBioShort(e.target.value)} maxLength={300} rows={3} />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={busy}>{busy ? "Creando…" : "Crear ficha"}</Button>
          <Button asChild type="button" variant="ghost"><Link to="/composers">Cancelar</Link></Button>
        </div>
      </form>
    </div>
  );
}