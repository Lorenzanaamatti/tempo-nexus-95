import { toast } from "sonner";

/**
 * Confirmación visual breve para guardados automáticos (al salir de un campo).
 * Unifica el mensaje en todos los editores en línea de la app.
 */
export function savedToast(message = "Guardado") {
  toast.success(message, { duration: 1200 });
}
