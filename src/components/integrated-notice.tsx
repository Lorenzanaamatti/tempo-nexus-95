import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function IntegratedInPartnersNotice() {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-dashed border-border bg-muted/30 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Esta sección ha sido integrada en Partners.</span>
        <Link to="/partners" className="inline-flex items-center gap-1 text-primary hover:underline smallcaps text-xs">
          Ir a Partners <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
