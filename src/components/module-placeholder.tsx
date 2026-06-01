import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";

export function ModulePlaceholder({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      <PageHeader title={title} description={description} />
      <div className="glass-panel rounded-2xl p-8">
        <div className="flex items-center gap-3 text-primary">
          <Construction className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">
            Próximamente
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Este módulo forma parte del roadmap de Lorenzana. La estructura, el
          design system y los permisos ya están listos para acogerlo.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f}
              className="rounded-lg border border-border bg-card/40 px-4 py-3 text-sm text-card-foreground/90"
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
