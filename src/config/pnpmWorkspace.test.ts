import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("pnpm workspace contract", () => {
  it("keeps the minimum release age at the project policy value", () => {
    const workspaceConfig = readFileSync(
      join(process.cwd(), "pnpm-workspace.yaml"),
      "utf8",
    );

    expect(workspaceConfig).toContain("minimumReleaseAge: 4320");
  });
});
