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
      account: { ...data.request.account, accountCategory: "general", phone: "+81-90-1234-5678", address: { countryCode: "JP", administrativeAreaCode: "13", postalCode: "100-0001", locality: "千代田区", addressLine1: "千代田1-1", addressLine2: "1F" } },
      documents: [{ documentType: "passport", documentPath: "snapshots/passport.pdf", uploadedAt: "today" }],
    },
  }),
  rejectionReasonCodes: [],
}));
describe("withdrawn operations display", () => {
  afterEach(cleanup);
  it("shows submitted contact information and links to the request document snapshot", () => {
    render(<AccountCategoryChangeRequestDetailClient />);
    for (const value of ["+81-90-1234-5678", "JP", "13", "100-0001", "千代田区", "千代田1-1", "1F"]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /passport.pdf/ })).toHaveAttribute("href", "/api/account/category-change-requests/request/documents/passport?download=1");
    expect(screen.queryByText("所属ユーザー一覧")).not.toBeInTheDocument();
  });
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
