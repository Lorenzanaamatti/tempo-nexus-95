import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DealMemosSubnav } from "@/components/deal-memos/subnav";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos")({
  component: DealMemosLayout,
});

function DealMemosLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5">
          <div>
            <p className="smallcaps text-[10px] tracking-wider text-muted-foreground">Interesante Compañía SL</p>
            <h1 className="mt-0.5 font-display text-3xl">Deal Memos</h1>
          </div>
        </div>
      </header>
      <DealMemosSubnav />
      <Outlet />
    </div>
  );
}