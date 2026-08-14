import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 py-8">
      {title && (
        <>
          <h2 className="font-display text-2xl">{title}</h2>
          <Separator />
        </>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/50 px-4 py-3">
      <div className="smallcaps text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
