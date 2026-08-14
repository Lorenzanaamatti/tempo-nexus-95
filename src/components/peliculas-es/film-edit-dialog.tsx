import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CrmAddMenu } from "./crm-add-menu";
import { EntityListEditor, type EntityItem } from "./entity-list-editor";
import {
  addCompanyToCrm,
  addDirectorToCrm,
  addPlatformToCrm,
  addToRoster,
  addToTargetAccounts,
  type Film,
  type RosterCompany,
  type RosterDirector,
  type RosterPerson,
} from "@/lib/spanish-films-crm";

export type FilmPatch = {
  composer: string | null;
  music_supervisor: string | null;
  platform: string | null;
  needs_review: boolean;
  directors: string[];
  director_ids: string[];
  production_companies: string[];
  production_company_ids: string[];
  composer_person_id: string | null;
  music_supervisor_person_id: string | null;
};

export function FilmEditDialog({
  film,
  rosterDirectors,
  rosterCompanies,
  rosterPeople,
  onClose,
  onSave,
  onDelete,
}: {
  film: Film | null;
  rosterDirectors: RosterDirector[];
  rosterCompanies: RosterCompany[];
  rosterPeople: RosterPerson[];
  onClose: () => void;
  onSave: (patch: FilmPatch) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [composer, setComposer] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [platform, setPlatform] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [directors, setDirectors] = useState<EntityItem[]>([]);
  const [companies, setCompanies] = useState<EntityItem[]>([]);
  const [composerPersonId, setComposerPersonId] = useState<string | null>(null);
  const [supervisorPersonId, setSupervisorPersonId] = useState<string | null>(null);

  useEffect(() => {
    if (film) {
      setComposer(film.composer ?? "");
      setSupervisor(film.music_supervisor ?? "");
      setPlatform(film.platform ?? "");
      setNeedsReview(film.needs_review);
      const dIds = film.director_ids ?? [];
      setDirectors((film.directors ?? []).map((name, i) => ({ name, id: dIds[i] ?? null })));
      const cIds = film.production_company_ids ?? [];
      setCompanies((film.production_companies ?? []).map((name, i) => ({ name, id: cIds[i] ?? null })));
      setComposerPersonId(film.composer_person_id ?? null);
      setSupervisorPersonId(film.music_supervisor_person_id ?? null);
    }
  }, [film]);

  const composerOptions = rosterPeople.filter((p) => p.role === "composer");
  const supervisorOptions = rosterPeople.filter((p) => p.role === "supervisor");

  return (
    <Dialog
      open={!!film}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{film?.title}</DialogTitle>
          <DialogDescription>
            {film?.year} · TMDb {film?.tmdb_id}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <EntityListEditor
            title="Directores"
            items={directors}
            onChange={setDirectors}
            roster={rosterDirectors.map((d) => ({ id: d.id, label: d.full_name }))}
            placeholder="Nombre del director"
            crmActionsFor={(it, setId) => [
              {
                label: it.id ? "Ya en Directores CRM" : "→ Crear en Directores CRM",
                onSelect: async () => {
                  const id = await addDirectorToCrm(it.name);
                  if (id) setId(id);
                },
              },
              {
                label: "→ Añadir a Cuentas Objetivo (otros)",
                onSelect: () => addToTargetAccounts({ name: it.name, account_type: "otros" }),
              },
            ]}
          />
          <EntityListEditor
            title="Productoras"
            items={companies}
            onChange={setCompanies}
            roster={rosterCompanies.map((c) => ({ id: c.id, label: c.name }))}
            placeholder="Nombre de la productora"
            crmActionsFor={(it, setId) => [
              {
                label: it.id ? "Ya en Productoras CRM" : "→ Crear en Productoras CRM",
                onSelect: async () => {
                  const id = await addCompanyToCrm(it.name);
                  if (id) setId(id);
                },
              },
              {
                label: "→ Añadir a Cuentas Objetivo (productora)",
                onSelect: () =>
                  addToTargetAccounts({
                    name: it.name,
                    account_type: "productora",
                    production_company_id: it.id,
                  }),
              },
            ]}
          />
          <div className="space-y-1.5">
            <Label>Compositor BSO</Label>
            <div className="flex items-center gap-2">
              <Input value={composer} onChange={(e) => setComposer(e.target.value)} className="flex-1" />
              {composer.trim() && (
                <CrmAddMenu
                  actions={[
                    {
                      label: composerPersonId ? "Ya en Roster" : "→ Añadir al Roster (composer)",
                      onSelect: async () => {
                        await addToRoster(composer, "composer");
                      },
                    },
                    {
                      label: "→ Añadir a Cuentas Objetivo (roster · composer)",
                      onSelect: () =>
                        addToTargetAccounts({
                          name: composer,
                          account_type: "roster",
                          roster_kind: "composer",
                        }),
                    },
                  ]}
                />
              )}
            </div>
            <Select
              value={composerPersonId ?? "none"}
              onValueChange={(v) => {
                if (v === "none") {
                  setComposerPersonId(null);
                } else {
                  setComposerPersonId(v);
                  const picked = composerOptions.find((p) => p.id === v);
                  if (picked) setComposer(picked.full_name);
                }
              }}
            >
              <SelectTrigger className="rounded-sm">
                <SelectValue placeholder="Vincular compositor del CRM…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sin vincular —</SelectItem>
                {composerOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {composerPersonId ? "● Vinculado al CRM" : "○ Solo texto (no aparecerá en su ficha)"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Supervisor musical</Label>
            <div className="flex items-center gap-2">
              <Input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className="flex-1" />
              {supervisor.trim() && (
                <CrmAddMenu
                  actions={[
                    {
                      label: supervisorPersonId ? "Ya en Roster" : "→ Añadir al Roster (supervisor)",
                      onSelect: async () => {
                        await addToRoster(supervisor, "supervisor");
                      },
                    },
                    {
                      label: "→ Añadir a Cuentas Objetivo (roster · otros)",
                      onSelect: () =>
                        addToTargetAccounts({
                          name: supervisor,
                          account_type: "roster",
                          roster_kind: "otros",
                        }),
                    },
                  ]}
                />
              )}
            </div>
            <Select
              value={supervisorPersonId ?? "none"}
              onValueChange={(v) => {
                if (v === "none") {
                  setSupervisorPersonId(null);
                } else {
                  setSupervisorPersonId(v);
                  const picked = supervisorOptions.find((p) => p.id === v);
                  if (picked) setSupervisor(picked.full_name);
                }
              }}
            >
              <SelectTrigger className="rounded-sm">
                <SelectValue placeholder="Vincular supervisor/a del CRM…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sin vincular —</SelectItem>
                {supervisorOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {supervisorPersonId ? "● Vinculado al CRM" : "○ Solo texto (no aparecerá en su ficha)"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Plataforma</Label>
            <div className="flex items-center gap-2">
              <Input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Netflix, Filmin, Movistar+, Cine…"
                className="flex-1"
              />
              {platform.trim() && (
                <CrmAddMenu
                  actions={[
                    {
                      label: "→ Crear en Plataformas CRM",
                      onSelect: async () => {
                        await addPlatformToCrm(platform);
                      },
                    },
                    {
                      label: "→ Añadir a Cuentas Objetivo (plataforma)",
                      onSelect: () =>
                        addToTargetAccounts({ name: platform, account_type: "plataforma" }),
                    },
                  ]}
                />
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={needsReview} onCheckedChange={setNeedsReview} />
            <span>Necesita revisión</span>
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={async () => {
              setBusy(true);
              await onDelete();
              setBusy(false);
            }}
            disabled={busy}
            className="mr-auto"
          >
            Eliminar
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSave({
                composer: composer.trim() || null,
                music_supervisor: supervisor.trim() || null,
                platform: platform.trim() || null,
                needs_review: needsReview,
                directors: directors.map((d) => d.name.trim()).filter(Boolean),
                director_ids: directors.map((d) => d.id).filter((x): x is string => !!x),
                production_companies: companies.map((c) => c.name.trim()).filter(Boolean),
                production_company_ids: companies.map((c) => c.id).filter((x): x is string => !!x),
                composer_person_id: composerPersonId,
                music_supervisor_person_id: supervisorPersonId,
              });
              setBusy(false);
            }}
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
