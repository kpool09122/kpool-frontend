import { describe, expect, it } from "vitest";

import { resolveAdminClientPage } from "./AdminAppClient";

describe("resolveAdminClientPage", () => {
  it("resolves the direct other settings route", () => {
    expect(resolveAdminClientPage("/admin/user/other")).toBe("userOther");
  });
});
