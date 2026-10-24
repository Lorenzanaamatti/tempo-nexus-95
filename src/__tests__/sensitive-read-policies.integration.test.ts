import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";

// Opt in because these checks read the project's live policy definitions.
const enabled = process.env.RUN_SECURITY_DB_TESTS === "1";
const tables = [
  "sales_document_compositions",
  "sales_document_composition_items",
  "sales_document_outputs",
  "social_post_assets",
  "social_post_metrics",
];

describe.skipIf(!enabled)("sensitive reads preserve legitimate role access", () => {
  for (const table of tables) {
    test(`${table}: scoped reads, unchanged BIG C writes`, () => {
      const output = execFileSync("lovable", ["supabase", "query",
        `SELECT cmd, qual, with_check, roles::text AS roles FROM pg_policies WHERE schemaname='public' AND tablename='${table}' ORDER BY cmd`,
        "--json"], { encoding: "utf8" });
      const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
      const result = normalize(output);
      expect(result).toContain("current_user_is_staff()");
      expect(result).toContain("{authenticated}");
      // Existing mutation policies remain BIG C-only, not TEAM or ROSTER.
      expect(result).toContain("current_user_is_admin()");
      expect(result).not.toMatch(/"qual"\s*:\s*"true"/);
      if (table.startsWith("social_post_")) {
        // Roster keeps access through the visible parent post, never all rows.
        expect(result).toContain("EXISTS");
        expect(result).toContain("FROM social_posts post");
        expect(result).toContain(`post.id = ${table}.post_id`);
      } else {
        expect(result).toMatch(/"qual"\s*:\s*"current_user_is_staff\(\)"/);
      }
    }, 30000);
  }
});