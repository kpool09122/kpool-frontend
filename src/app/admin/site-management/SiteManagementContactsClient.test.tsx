import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteManagementContactsClient } from "./SiteManagementContactsClient";

vi.mock("./SiteManagementPageClient", () => ({ SiteManagementPageClient: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("../user/contacts/MyContactsClient", () => ({ MyContactsClient: () => <p>Read-only own contacts</p> }));
vi.mock("./contacts/SiteManagementContactsClient", () => ({ SiteManagementContactsClient: () => <p>Operator unanswered contacts</p> }));
afterEach(cleanup);

describe("site-management contact route", () => {
  it("renders own contacts on the personal contact route", () => {
    render(<SiteManagementContactsClient />);
    expect(screen.getByText("Read-only own contacts")).toBeInTheDocument();
    expect(screen.queryByText("Operator unanswered contacts")).not.toBeInTheDocument();
  });
});
