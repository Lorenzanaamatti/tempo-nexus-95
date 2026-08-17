import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/** Botón de borrado con confirmación modal accesible. */
export function ConfirmDeleteButton({
  onConfirm,
  title,
  description = "Esta acción no se puede deshacer.",
  label = "Eliminar",
  confirmLabel = "Eliminar",
  iconOnly = false,
  disabled,
}: {
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  label?: string;
  confirmLabel?: string;
  iconOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label={label}
          title={label}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className={iconOnly ? "h-4 w-4" : "mr-1 h-4 w-4"} />
          {!iconOnly && label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void onConfirm()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
