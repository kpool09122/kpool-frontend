import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "../../../../i18n/dictionaries";
import { MyContactsClient } from "./MyContactsClient";

vi.mock("../../../../i18n/I18nProvider", () => ({ useI18n: () => ({ dictionary: dictionaries.ja }) }));
vi.mock("../../AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: { identityIdentifier: "identity" } }) }));

const contact = {
  contactIdentifier: "11111111-1111-4111-8111-111111111111",
  principalIdentifier: null,
  category: 1,
  name: "問い合わせ太郎",
  replyIdentifiers: [],
  createdAt: "2026-08-27T12:00:00+00:00",
};

describe("MyContactsClient content preview", () => {
  afterEach(cleanup);

  it("shows all inquiries by default and filters to replied inquiries when checked", () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["myContacts", "identity"], [
      { ...contact, content: "Awaiting a reply" },
      { ...contact, contactIdentifier: "22222222-2222-4222-8222-222222222222", content: "Already replied", replyIdentifiers: ["reply"] },
    ]);
    render(<QueryClientProvider client={client}><MyContactsClient /></QueryClientProvider>);
    const filter = screen.getByRole("checkbox", { name: "返信ありのみ" });
    expect(filter).not.toBeChecked();
    expect(screen.getByText("Awaiting a reply")).toBeInTheDocument();
    expect(screen.getByText("Already replied")).toBeInTheDocument();
    fireEvent.click(filter);
    expect(filter).toBeChecked();
    expect(screen.queryByText("Awaiting a reply")).not.toBeInTheDocument();
    expect(screen.getByText("Already replied")).toBeInTheDocument();
    fireEvent.click(filter);
    expect(screen.getByText("Awaiting a reply")).toBeInTheDocument();
    expect(screen.getByText("Already replied")).toBeInTheDocument();
    client.clear();
  });

  it("shows the original inquiry and support replies as a conversation", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["myContacts", "identity"], [{ ...contact, content: "My inquiry" }]);
    client.setQueryData(["myContacts", "identity", contact.contactIdentifier], {
      ...contact, content: "My inquiry", replies: [{ replyIdentifier: "reply", content: "Support response", sentAt: "2026-08-28T12:00:00+00:00" }],
    });
    render(<QueryClientProvider client={client}><MyContactsClient /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    const messages = within(screen.getByRole("list", { name: dictionaries.ja.admin.contactConversation.label })).getAllByRole("listitem");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toHaveTextContent("あなた");
    expect(messages[0]).toHaveTextContent("My inquiry");
    expect(messages[1]).toHaveTextContent("運営");
    expect(messages[1]).toHaveTextContent("Support response");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    client.clear();
  });

  it.each(["短い本文", "あ".repeat(20), "長い問い合わせ本文".repeat(20), "改行を含む\n問い合わせ本文"])("keeps the full content in a single-line preview: %s", (content) => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["myContacts", "identity"], [{ ...contact, content }]);

    render(<QueryClientProvider client={client}><MyContactsClient /></QueryClientProvider>);

    const preview = screen.getByText("ご要望").nextElementSibling;
    expect(preview?.textContent).toBe(content);
    expect(preview).toHaveClass("min-w-0", "flex-1", "truncate");
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    client.clear();
  });
});
