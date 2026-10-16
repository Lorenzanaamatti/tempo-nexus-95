import { describe, it, expect } from "bun:test";
import { canImportTasks, parseTaskDate, resolveDueDate, fridayOf } from "@/lib/task-import";

describe("task import", () => {
  it("authorizes only Clàudia and Lourdes emails", () => {
    expect(canImportTasks("CLAUDIA@JUNY.TV")).toBe(true);
    expect(canImportTasks("claudia@fronterah.com")).toBe(true);
    expect(canImportTasks("louplusmusic@gmail.com")).toBe(true);
    expect(canImportTasks("lourdes@plus-music.com")).toBe(true);
    expect(canImportTasks("otra@juny.tv")).toBe(false);
  });
  it("parses Spanish dates inside text", () => {
    expect(parseTaskDate("13/11/2026 (caduca)")).toBe("2026-11-13");
    expect(parseTaskDate("desde 20/10/2026")).toBe("2026-10-20");
    expect(parseTaskDate("31/02/2026")).toBeNull();
  });
  it("urgent without date falls on this week's Friday", () => {
    expect(fridayOf("2026-10-16")).toBe("2026-10-16");
    expect(resolveDueDate({ tarea: "x", urgencia: 1 }, "2026-10-14")).toBe("2026-10-16");
    expect(resolveDueDate({ tarea: "x", urgencia: 2 }, "2026-10-14")).toBeNull();
  });
});
