import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteManagementContactsClient } from "./SiteManagementContactsClient";

const mocks = vi.hoisted(() => ({ canView: false }));
vi.mock("../AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: {} }) }));
vi.mock("@/gateways/site-management/siteManagementPolicy", () => ({ canViewSiteManagementContacts: () => mocks.canView }));
vi.mock("./SiteManagementPageClient", () => ({ SiteManagementPageClient: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("../user/contacts/MyContactsClient", () => ({ MyContactsClient: () => <p>Read-only own contacts</p> }));
vi.mock("./contacts/SiteManagementContactsClient", () => ({ SiteManagementContactsClient: () => <p>Operator unanswered contacts</p> }));
afterEach(cleanup);

describe("site-management contact route", () => {
  it("uses the operator list only for unrestricted contact viewers", () => {
    mocks.canView = true;
    render(<SiteManagementContactsClient />);
    expect(screen.getByText("Operator unanswered contacts")).toBeInTheDocument();
    expect(screen.queryByText("Read-only own contacts")).not.toBeInTheDocument();
  });
  it("preserves main's read-only own contact page otherwise", () => {
    mocks.canView = false;
    render(<SiteManagementContactsClient />);
    expect(screen.getByText("Read-only own contacts")).toBeInTheDocument();
    expect(screen.queryByText("Operator unanswered contacts")).not.toBeInTheDocument();
  });
});
