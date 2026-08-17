import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  IC_FUNCTION_LABEL,
  groupIcFunctions,
  type IcTeamFunction,
} from "@/components/person-ic-functions-editor";

const AI_GROUP = "Agentes IA";

/**
 * Muestra las funciones de una persona agrupadas por categoría, con jerarquía
 * tipográfica: etiqueta de grupo en versalitas atenuadas + chips discretos.
 */
export function IcFunctionTags({
  fns,
  max = 5,
  className,
}: {
  fns: IcTeamFunction[];
  /** Nº máximo de funciones visibles; el resto se resume en un chip "+N". Usa Infinity para mostrarlas todas. */
  max?: number;
  className?: string;
}) {
  if (!fns?.length) return null;

  const groups = groupIcFunctions(fns);
  const visible: { groupLabel: string; items: IcTeamFunction[] }[] = [];
  const hidden: IcTeamFunction[] = [];
  let budget = max;

  for (const g of groups) {
    if (budget <= 0) {
      hidden.push(...g.items);
      continue;
    }
    const items = g.items.slice(0, budget);
    hidden.push(...g.items.slice(budget));
    budget -= items.length;
    visible.push({ groupLabel: g.groupLabel, items });
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-1.5", className)}>
      {visible.map((g) => (
        <div key={g.groupLabel} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="smallcaps text-[9px] leading-none text-muted-foreground/70">{g.groupLabel}</span>
          {g.items.map((fn) => (
            <span
              key={fn}
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-[10px] leading-none",
                g.groupLabel === AI_GROUP
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {IC_FUNCTION_LABEL[fn]}
            </span>
          ))}
        </div>
      ))}
      {hidden.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                +{hidden.length}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {hidden.map((fn) => IC_FUNCTION_LABEL[fn]).join(" · ")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
