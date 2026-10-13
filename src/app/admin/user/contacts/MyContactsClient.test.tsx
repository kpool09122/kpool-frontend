import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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
