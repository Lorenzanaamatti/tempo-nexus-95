import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  REPRESENTATION_STATUS_OPTIONS,
  REPRESENTATION_STATUS_TONE,
  representationStatusLabel,
} from "@/lib/representation-status";
import { cn } from "@/lib/utils";

/** Botón desplegable para fijar el estado de representación de una ficha. */
export function RepresentationStatusMenu({
  value,
  onChange,
  size = "sm",
  className,
}: {
  value: string | null | undefined;
  onChange: (next: string) => void;
  size?: "sm" | "default";
  className?: string;
}) {
  const current = value ?? "activo";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={size}
          variant="outline"
          className={cn("smallcaps rounded-sm border", REPRESENTATION_STATUS_TONE[current], className)}
        >
          {representationStatusLabel(current)}
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Estado de representación</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {REPRESENTATION_STATUS_OPTIONS.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => onChange(o.value)}>
            <Check className={cn("mr-2 h-4 w-4", current === o.value ? "opacity-100" : "opacity-0")} />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
