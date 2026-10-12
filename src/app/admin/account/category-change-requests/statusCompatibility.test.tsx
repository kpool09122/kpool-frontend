import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "../../../../i18n/dictionaries";
import { AccountCategoryChangeRequestsClient } from "./AccountCategoryChangeRequestsClient";
import { AccountCategoryChangeRequestDetailClient } from "./[requestId]/AccountCategoryChangeRequestDetailClient";

const data = vi.hoisted(() => ({
  request: {
    requestIdentifier: "request",
    status: "withdrawn",
    currentAccountCategory: "general",
    requestedAccountCategory: "agency",
    requestedAt: "today",
    account: { name: "Account", email: "test@example.com" },
  },
}));
vi.mock("../AccountSectionContext", () => ({
  useAccountSection: () => ({
    t: dictionaries.ja.admin,
    canManageCategoryChangeRequests: true,
  }),
}));
vi.mock("./useAccountCategoryChangeRequests", () => ({
  useAccountCategoryChangeRequests: () => ({
    data: { requests: [data.request], current_page: 1, last_page: 1 },
    openDetail: vi.fn(),
  }),
}));
vi.mock("./[requestId]/useAccountCategoryChangeRequestDetail", () => ({
  useAccountCategoryChangeRequestDetail: () => ({
    data: {
      request: data.request,
      account: { ...data.request.account, accountCategory: "general" },
      identities: [],
      documents: [],
    },
  }),
  rejectionReasonCodes: [],
}));
describe("withdrawn operations display", () => {
  afterEach(cleanup);
  it.each([
    AccountCategoryChangeRequestsClient,
    AccountCategoryChangeRequestDetailClient,
  ])("labels withdrawn without review actions", (Client) => {
    render(<Client />);
    expect(screen.getByText("取り下げ済み")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: dictionaries.ja.admin.accountCategoryChangeRequestDetail.approve,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: dictionaries.ja.admin.accountCategoryChangeRequestDetail.reject,
      }),
    ).not.toBeInTheDocument();
  });
});
