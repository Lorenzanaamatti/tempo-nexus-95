import { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TransferAction = {
  label: string;
  description?: string;
  onSelect: () => unknown | Promise<unknown>;
};

/**
 * Menú común de traspaso entre CRMs: lleva una ficha a otro módulo
 * conservando los datos ya introducidos.
 */
export function CrmTransferMenu({
  actions,
  label = "Llevar a…",
}: {
  actions: TransferAction[];
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run(action: TransferAction) {
    setBusy(true);
    try {
      await action.onSelect();
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-1 h-4 w-4" />}
          {busy ? "Traspasando…" : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Traspasar esta ficha a…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((a, i) => (
          <DropdownMenuItem key={i} onSelect={() => void run(a)} className="flex flex-col items-start gap-0.5">
            <span>{a.label}</span>
            {a.description && <span className="text-xs text-muted-foreground">{a.description}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
