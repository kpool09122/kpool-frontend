import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { AccountLayoutClient } from "./account/AccountLayoutClient";
import { WikiLayoutClient } from "./wiki/WikiLayoutClient";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
const identity = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountType: "individual",
  accountPolicies: [{ policyIdentifier: "policy-1", name: "MANAGER", isSystemPolicy: true, statements: [{ effect: "allow", actions: ["account:principal-group:manage"], resourceTypes: ["ACCOUNT"], condition: null }] }],
};
const principal = {
  principalIdentifier: "33333333-3333-4333-8333-333333333333",
  identityIdentifier: identity.identityIdentifier,
  isDelegatedPrincipal: false,
  isEnabled: true,
  policies: [{ policyIdentifier: "policy-2", name: "MANAGER", isSystemPolicy: true, statements: [{ effect: "allow", actions: ["principal-group-manage"], resourceTypes: ["principal_group"], condition: null }] }],
};

describe("principal group menu tabs", () => {
  afterEach(cleanup);
  it.each([0, 1, 2])("shows account permissions only with at least two Identities: %s", (count) => {
    render(<AccountLayoutClient activeTab="accountProfile" currentIdentity={{ ...identity, accountIdentityCount: count }} t={dictionaries.ja.admin} onAuthorizationRejected={vi.fn()}>{null}</AccountLayoutClient>);
    expect(Boolean(screen.queryByRole("tab", { name: "ユーザー権限管理" }))).toBe(count >= 2);
  });
  it.each([1, 2])("shows Wiki permissions only with at least two Wiki principals: %s", (count) => {
    render(<WikiLayoutClient isAuthenticated isPending={false} selectedWikiTab="editingWikis" state={{ status: "available", principal: { ...principal, accountPrincipalCount: count } }} t={dictionaries.ja.admin} onActivate={vi.fn()} onRetry={vi.fn()} onOpenCreateDraftWiki={vi.fn()} officialCertificationRequestResourceTypes={[]}>{() => null}</WikiLayoutClient>);
    expect(Boolean(screen.queryByRole("tab", { name: "Wikiユーザー権限管理" }))).toBe(count >= 2);
  });
});
