import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { formatDateEs } from "@/lib/dates";
import {
  PLATFORM_STATUS,
  PLATFORM_STATUS_CLASS,
  usePlatforms,
  useInvalidateCareerPlan,
  type PlatformStatus,
} from "@/lib/career-plan";

type Row = {
  id: string;
  nombre: string;
  url: string | null;
  estado: PlatformStatus;
  fecha_ultima_actualizacion: string | null;
  notas: string | null;
  custom: boolean;
};

export function PlatformsChecklist({
  composerId,
  canEdit,
  isBigC = false,
}: {
  composerId: string;
  canEdit: boolean;
  isBigC?: boolean;
}) {
  const { data } = usePlatforms(composerId);
  const invalidate = useInvalidateCareerPlan();
  const [newName, setNewName] = useState("");

  const rows: Row[] = [
    ...(data?.base ?? []).map((r: any) => ({ ...r, nombre: r.nombre as string, custom: false })),
    ...(data?.custom ?? []).map((r: any) => ({ ...r, nombre: r.nombre_plataforma as string, custom: true })),
  ];

  async function patch(row: Row, values: Record<string, unknown>) {
    const table = row.custom ? "representado_plataformas_custom" : "representado_plataformas";
    const { error } = await supabase.from(table as never).update(values as never).eq("id", row.id);
    if (error) toast.error(error.message);
    else invalidate();
  }

  async function addCustom() {
    if (!newName.trim()) return;
    const { error } = await supabase
      .from("representado_plataformas_custom")
      .insert({ representado_id: composerId, nombre_plataforma: newName.trim(), estado: "Sin perfil" });
    if (error) toast.error(error.message);
    else {
      setNewName("");
      invalidate();
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin plataformas registradas.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Plataforma</th>
              <th className="px-3 py-2 font-medium">URL</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Últ. actualización</th>
              <th className="px-3 py-2 font-medium">Notas</th>
              {canEdit && <th className="w-10 px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={`${row.custom}-${row.id}`}>
                <td className="px-3 py-2 font-medium">{row.nombre}</td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <Input
                      defaultValue={row.url ?? ""}
                      placeholder="https://…"
                      className="h-8"
                      onBlur={(e) => e.target.value !== (row.url ?? "") && patch(row, { url: e.target.value || null })}
                    />
                  ) : row.url ? (
                    <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                      Abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <select
                      className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
                      value={row.estado}
                      onChange={(e) => patch(row, { estado: e.target.value })}
                    >
                      {PLATFORM_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex rounded-sm px-2 py-0.5 text-xs ${PLATFORM_STATUS_CLASS[row.estado]}`}>{row.estado}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <Input
                      type="date"
                      className="h-8"
                      defaultValue={row.fecha_ultima_actualizacion ?? ""}
                      onBlur={(e) => patch(row, { fecha_ultima_actualizacion: e.target.value || null })}
                    />
                  ) : (
                    formatDateEs(row.fecha_ultima_actualizacion)
                  )}
                </td>
                <td className="px-3 py-2">
                  {canEdit ? (
                    <Input
                      className="h-8"
                      defaultValue={row.notas ?? ""}
                      onBlur={(e) => e.target.value !== (row.notas ?? "") && patch(row, { notas: e.target.value || null })}
                    />
                  ) : (
                    <span className="text-muted-foreground">{row.notas || "—"}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-3 py-2">
                    {row.custom && (
                      <button
                        type="button"
                        aria-label={`Eliminar ${row.nombre}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          await supabase.from("representado_plataformas_custom").delete().eq("id", row.id);
                          invalidate();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isBigC && (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la plataforma"
            className="h-9 max-w-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustom}>
            <Plus className="mr-1 h-4 w-4" /> Añadir plataforma
          </Button>
        </div>
      )}
    </div>
  );
}
