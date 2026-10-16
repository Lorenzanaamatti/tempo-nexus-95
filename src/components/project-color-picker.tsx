import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PROJECT_PALETTE, projectColorVar } from "@/lib/project-palette";

export function ProjectColorPicker({ productionId, value }: { productionId: string; value: string }) {
  const qc = useQueryClient();
  const save = async (key: string) => {
    const { error } = await (supabase as any).from("productions").update({ gantt_color: key }).eq("id", productionId);
    if (error) return toast.error("No se pudo guardar el color");
    qc.invalidateQueries({ queryKey: ["gantt-phases"] });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Cambiar color del proyecto"
          className="h-4 w-4 shrink-0 rounded-[3px] border border-border"
          style={{ background: projectColorVar(value) }}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-5 gap-1.5">
          {PROJECT_PALETTE.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={`Color ${k.slice(1)}`}
              onClick={() => save(k)}
              className={`h-6 w-6 rounded-[3px] border ${k === value ? "border-foreground ring-2 ring-foreground/40" : "border-transparent"}`}
              style={{ background: projectColorVar(k) }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
