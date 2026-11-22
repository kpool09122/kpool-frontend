import { describe, expect, it, vi } from "vitest";
import { canManageMonetization, getMonetizationApiBaseUrl, getMonetizationPrincipal, activateMonetization, fetchMonetizationGroups } from "./monetizationPrincipal";
const principal = { principalIdentifier: "11111111-1111-4111-8111-111111111111", identityIdentifier: "22222222-2222-4222-8222-222222222222", status: "active" as const, accountPrincipalCount: 1, policies: [{ policyIdentifier: "33333333-3333-4333-8333-333333333333", name: "Owner", statements: [{ effect: "allow" as const, actions: ["principal_group_manage" as const], resourceTypes: ["principal_group" as const], condition: null }] }] };
describe("Monetization gateway", () => {
 it("normalizes host and full API URLs without losing the backend API prefix", () => {
  for (const base of ["http://backend.test", "http://backend.test/", "http://backend.test/api/v1/monetization/"]) {
   vi.stubEnv("KPOOL_MONETIZATION_API_BASE_URL", base);
   expect(getMonetizationApiBaseUrl()).toBe("http://backend.test/api/v1/monetization");
  }
  vi.stubEnv("KPOOL_MONETIZATION_API_BASE_URL", "");
  expect(getMonetizationApiBaseUrl()).toBeNull();
  vi.unstubAllEnvs();
 });
 it("uses generated schemas for the current snapshot and includes session credentials", async () => {
  const fetchAdapter = vi.fn().mockResolvedValue(Response.json(principal));
  expect(await getMonetizationPrincipal({ fetchAdapter })).toEqual({ status: "available", principal });
  expect(fetchAdapter).toHaveBeenCalledWith("/api/monetization/principal/me", expect.objectContaining({ credentials: "include", cache: "no-store" }));
 });
 it("distinguishes unenrolled, stopped, invalid and failed snapshots", async () => {
  expect(await getMonetizationPrincipal({ fetchAdapter: vi.fn().mockResolvedValue(Response.json({}, { status: 404 })) })).toEqual({ status: "missing" });
  expect((await getMonetizationPrincipal({ fetchAdapter: vi.fn().mockResolvedValue(Response.json({ ...principal, status: "forced_stop" })) })).status).toBe("available");
  expect((await getMonetizationPrincipal({ fetchAdapter: vi.fn().mockResolvedValue(Response.json({})) })).status).toBe("error");
  expect((await getMonetizationPrincipal({ fetchAdapter: vi.fn().mockRejectedValue(new Error("secret")) })).status).toBe("error");
 });
 it("enables only on explicit POST without sending account or identity selection", async () => {
  const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ principalIdentifier: principal.principalIdentifier, identityIdentifier: principal.identityIdentifier }));
  expect(await activateMonetization({ fetchAdapter })).toEqual({ ok: true });
  expect(fetchAdapter).toHaveBeenCalledWith("/api/monetization/principals", expect.objectContaining({ method: "POST", credentials: "include" }));
  expect(fetchAdapter.mock.calls[0][1]).not.toHaveProperty("body");
 });
 it("reports duplicate enrollment for authoritative refetch, not reactivation", async () => {
  expect(await activateMonetization({ fetchAdapter: vi.fn().mockResolvedValue(Response.json({}, { status: 409 })) })).toMatchObject({ ok: false, status: 409 });
 });
 it("combines groups with all enrolled members, including ungrouped members", async () => {
  const member = { ...principal, identityName: "User", email: "user@example.test" };
  const fetchAdapter = vi.fn().mockResolvedValue(Response.json({ groups: [], users: [member] }));
  expect(await fetchMonetizationGroups({ fetchAdapter, fallback: "Failed" })).toMatchObject({ groups: [], users: [{ principalIdentifier: principal.principalIdentifier }] });
 });
 it("evaluates Deny, active status and account conditions without using Wiki permissions", () => {
  expect(canManageMonetization(principal, "account")).toBe(true);
  expect(canManageMonetization({ ...principal, status: "suspended" }, "account")).toBe(false);
  const statement = principal.policies[0].statements[0];
  expect(canManageMonetization({ ...principal, policies: [{ ...principal.policies[0], statements: [statement, { ...statement, effect: "deny" }] }] }, "account")).toBe(false);
  const conditioned = (operator: "eq" | "ne" | "in" | "not_in", value: string | string[]) => ({ ...principal, policies: [{ ...principal.policies[0], statements: [{ ...statement, condition: { clauses: [{ field: "resource:accountId" as const, operator, value }] } }] }] });
  expect(canManageMonetization(conditioned("eq", "account"), "account")).toBe(true);
  expect(canManageMonetization(conditioned("eq", "other"), "account")).toBe(false);
  expect(canManageMonetization(conditioned("eq", ["account"]), "account")).toBe(false);
  expect(canManageMonetization(conditioned("ne", ["account"]), "account")).toBe(true);
  expect(canManageMonetization(conditioned("eq", "${principal:accountId}"), "account")).toBe(false);
  expect(canManageMonetization(conditioned("in", ["account"]), "account")).toBe(true);
  expect(canManageMonetization(conditioned("ne", "account"), "account")).toBe(false);
  expect(canManageMonetization(conditioned("not_in", ["other"]), "account")).toBe(true);
 });
});
