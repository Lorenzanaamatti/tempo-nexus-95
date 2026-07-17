import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import searchRosterTool from "./tools/search-roster";
import listDealMemosTool from "./tools/list-deal-memos";
import listCalendarEventsTool from "./tools/list-calendar-events";

// Direct Supabase issuer is required (the .lovable.cloud proxy is rejected as RFC 8414 issuer mismatch).
// The project ref is inlined at build time via VITE_SUPABASE_PROJECT_ID.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "interesante-compania-mcp",
  title: "Interesante Compañía",
  version: "0.1.0",
  instructions:
    "Herramientas de solo lectura sobre el CRM de Interesante Compañía (roster, deal memos, calendario). Cada usuario se autentica con su propia cuenta y las respuestas respetan sus permisos.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, searchRosterTool, listDealMemosTool, listCalendarEventsTool],
});