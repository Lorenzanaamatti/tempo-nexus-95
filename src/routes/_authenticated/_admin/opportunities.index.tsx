import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesList } from "@/components/opportunities-list";

export const Route = createFileRoute("/_authenticated/_admin/opportunities/")({
  component: OpportunitiesIndex,
});

function OpportunitiesIndex() {
  return <OpportunitiesList />;
}
