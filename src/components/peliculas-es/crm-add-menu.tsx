import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CrmAction = { label: string; onSelect: () => unknown | Promise<unknown> };

export function CrmAddMenu({ actions }: { actions: CrmAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          title="Añadir a CRM / Cuentas Objetivo"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Añadir a…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((a, i) => (
          <DropdownMenuItem key={i} onSelect={() => void a.onSelect()}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
