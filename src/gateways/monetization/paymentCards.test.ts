import { afterEach, expect, it, vi } from "vitest";
import { hasCardPermission, paymentCardsApi } from "./paymentCards";
import { principalSchema } from "./monetizationPrincipal";
import {
  clearCardRecovery,
  consumeCardRecoveryRedirect,
  readCardRecovery,
  saveCardRecovery,
} from "./cardRecovery";
const id = "11111111-1111-4111-8111-111111111111";
const principal = {
  principalIdentifier: id,
  identityIdentifier: id,
  status: "active",
  accountPrincipalCount: 1,
  policies: [
    {
      policyIdentifier: id,
      name: "Owner",
      statements: [
        {
          effect: "allow",
          actions: [
            "payment_method_read",
            "card_registration_prepare",
            "payment_method_register",
            "payment_method_delete",
          ],
          resourceTypes: ["payment_method"],
          condition: null,
        },
      ],
    },
  ],
};
afterEach(() => {
  clearCardRecovery();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("accepts actual backend card actions without using group management as authorization", () => {
  const parsed = principalSchema.safeParse(principal);
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;
  for (const action of [
    "payment_method_read",
    "card_registration_prepare",
    "payment_method_register",
    "payment_method_delete",
  ] as const)
    expect(hasCardPermission(parsed.data, id, action)).toBe(true);
  const groupOnly = {
    ...parsed.data,
    policies: parsed.data.policies.map((p) => ({
      ...p,
      statements: p.statements.map((s) => ({
        ...s,
        actions: ["principal_group_manage" as const],
        resourceTypes: ["principal_group" as const],
      })),
    })),
  };
  expect(hasCardPermission(groupOnly, id, "payment_method_read")).toBe(false);
  expect(
    hasCardPermission(
      { ...parsed.data, status: "forced_stop" },
      id,
      "payment_method_read",
    ),
  ).toBe(false);
  const denied = {
    ...parsed.data,
    policies: parsed.data.policies.map((p) => ({
      ...p,
      statements: [
        ...p.statements,
        { ...p.statements[0], effect: "deny" as const },
      ],
    })),
  };
  expect(hasCardPermission(denied, id, "payment_method_read")).toBe(false);
  const condition = {
    clauses: [
      {
        field: "resource:accountId" as const,
        operator: "eq" as const,
        value: [id],
      },
    ],
  };
  expect(
    hasCardPermission(
      {
        ...parsed.data,
        policies: parsed.data.policies.map((p) => ({
          ...p,
          statements: p.statements.map((s) => ({ ...s, condition })),
        })),
      },
      id,
      "payment_method_read",
    ),
  ).toBe(false);
});
it("stores only non-secret operations and consumes a same-scope social return once", () => {
  expect(
    saveCardRecovery("scope-A", {
      kind: "complete",
      identifier: "seti_fixture",
    }),
  ).toBe(true);
  expect(JSON.stringify({ ...sessionStorage })).not.toContain("secret");
  expect(consumeCardRecoveryRedirect("scope-A")).toBe(true);
  expect(consumeCardRecoveryRedirect("scope-A")).toBe(false);
  expect(readCardRecovery("scope-A")?.operation).toEqual({
    kind: "complete",
    identifier: "seti_fixture",
  });
  expect(readCardRecovery("scope-B")).toBeNull();
  expect(readCardRecovery("scope-A")).toBeNull();
});
it("expires recovery and fails closed when storage is unavailable", () => {
  vi.useFakeTimers();
  saveCardRecovery("scope-A", { kind: "delete", identifier: id });
  vi.advanceTimersByTime(600001);
  expect(readCardRecovery("scope-A")).toBeNull();
  vi.stubGlobal("sessionStorage", {
    setItem: () => {
      throw new Error("Unavailable");
    },
    removeItem: () => undefined,
  });
  expect(saveCardRecovery("scope-A", { kind: "prepare" })).toBe(false);
});
it("sends only setupIntentIdentifier with credentials and converts network failures to explicit results", async () => {
  document.cookie = "XSRF-TOKEN=csrf; Path=/";
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { code: "recent_authentication_required", message: "private trace" },
        { status: 401 },
      ),
    )
    .mockRejectedValueOnce(new Error("private network details"));
  vi.stubGlobal("fetch", fetch);
  expect(await paymentCardsApi.complete("seti_fixture")).toEqual({
    ok: false,
    status: 401,
    code: "recent_authentication_required",
  });
  expect(fetch).toHaveBeenCalledWith(
    "/api/monetization/payment-methods",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ setupIntentIdentifier: "seti_fixture" }),
    }),
  );
  expect(await paymentCardsApi.list()).toEqual({ ok: false, status: 502 });
});
