import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addDirectorToCrm, moveProductoraToContactar, moveProductoraToPartners } from "@/lib/espanolas-actions";
import { useQueryClient } from "@tanstack/react-query";
import { addCompanyToCrm, addToTargetAccounts } from "@/lib/spanish-films-crm";
import { cn } from "@/lib/utils";

export function ProductoraActionsMenu({
  name,
  compact = false,
  className,
  hideTargetAccounts = false,
}: {
  name: string;
  hideTargetAccounts?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: ["partners"] }); qc.invalidateQueries({ queryKey: ["opportunities"] }); };
  const cleanName = name.trim();

  async function openCompany() {
    const id = await addCompanyToCrm(cleanName);
    if (id) navigate({ to: "/production-companies/$companyId", params: { companyId: id } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={cn(compact ? "h-7 w-7" : "h-auto justify-start px-0 py-0 text-left font-normal underline decoration-dotted underline-offset-4 hover:bg-transparent hover:text-primary", className)}
          aria-label={compact ? `Acciones para ${cleanName}` : undefined}
        >
          {compact ? <MoreHorizontal className="h-4 w-4" /> : cleanName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="truncate">{cleanName}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void openCompany()}>Abrir ficha de productora</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void moveProductoraToPartners(cleanName).then(refresh)}>Llevar a Productoras Partners</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void moveProductoraToContactar(cleanName).then(refresh)}>Llevar a Productoras a contactar</DropdownMenuItem>
        {!hideTargetAccounts && <DropdownMenuItem onSelect={() => void addToTargetAccounts({ name: cleanName, account_type: "productora" })}>Añadir a Cuentas objetivo</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DirectorActionsMenu({ name }: { name: string }) {
  const navigate = useNavigate();
  const cleanName = name.trim();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-auto justify-start px-0 py-0 text-left font-normal underline decoration-dotted underline-offset-4 hover:bg-transparent hover:text-primary">
          {cleanName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="truncate">{cleanName}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void addDirectorToCrm(cleanName)}>Añadir a CRM de directores</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void addDirectorToCrm(cleanName).then((id) => { if (id) void navigate({ to: "/directors/$directorId", params: { directorId: id } }); })}>Abrir ficha de director</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
