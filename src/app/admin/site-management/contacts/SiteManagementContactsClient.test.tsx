import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SiteManagementContactDetail, SiteManagementContactsPage } from "@/gateways/site-management/siteManagementContacts";
import { dictionaries } from "@/i18n/dictionaries";
import { SiteManagementContactsClient } from "./SiteManagementContactsClient";

const mocks = vi.hoisted(() => ({ actions: ["contact:view", "contact:reply"] }));
vi.mock("../../AdminProvider", () => ({
  useAdmin: () => ({
    locale: "ja",
    t: dictionaries.ja.admin,
    currentIdentity: {
      identityIdentifier: "operator",
      accountIdentifier: "account",
      accountPrincipalStatus: "active",
      siteManagementPrincipalStatus: "active",
      account: { status: "active" },
      siteManagementPrincipalIdentifier: "019a1234-5678-7000-8000-666666666666",
      siteManagementPolicies: [{
        name: "Operator",
        policyIdentifier: "policy",
        statements: [{ effect: "allow", actions: mocks.actions, resourceTypes: ["contact"], condition: null }],
      }],
    },
  }),
}));

const identifier = "019a1234-5678-7000-8000-111111111111";
const contact: SiteManagementContactsPage["contacts"][number] = {
  contactIdentifier: identifier,
  principalIdentifier: null,
  category: 1,
  name: "Anonymous sender",
  content: "Anonymous inquiry",
  replyIdentifiers: [],
  replies: [],
  createdAt: "2026-10-08T00:00:00+00:00",
};
const detail: SiteManagementContactDetail = { ...contact, content: "Anonymous inquiry", replies: [] };
const savedReply: SiteManagementContactDetail["replies"][number] = {
  replyIdentifier: identifier,
  replyNumber: 1,
  principalIdentifier: null,
  name: null,
  content: "Reply",
  sentAt: "2026-10-09T00:00:00+00:00",
  createdAt: "2026-10-09T00:00:00+00:00",
};
const text = dictionaries.ja.admin.siteManagementContacts;
const listUrl = "/api/site-management/contacts?replyStatus=pending&page=1&perPage=50";
const detailUrl = `/api/site-management/contacts/${identifier}`;
const replyUrl = `${detailUrl}/replies`;
const page = (contacts = [contact]) => ({ contacts, current_page: 1, last_page: 1, total: contacts.length, per_page: 50 });

function renderContacts() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><SiteManagementContactsClient /></QueryClientProvider>);
  return { ...view, client };
}

beforeEach(() => {
  mocks.actions = ["contact:view", "contact:reply"];
  document.cookie = "XSRF-TOKEN=test-csrf; Path=/";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.cookie = "XSRF-TOKEN=; Max-Age=0; Path=/";
});

describe("site-management contacts anonymous inquiry path", () => {
  it("defaults to unanswered inquiries and resets pagination when toggling the filter", async () => {
    const answered = { ...contact, name: "Answered sender", contactIdentifier: "019a1234-5678-7000-8000-222222222222", replyIdentifiers: [identifier], replies: [{ ...savedReply, principalIdentifier: "019a1234-5678-7000-8000-666666666666" }] };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const params = new URL(String(input), window.location.origin).searchParams;
      const filtered = params.get("replyStatus") === "pending";
      return Response.json({ ...page(filtered ? [contact] : [contact, answered]), current_page: Number(params.get("page")), last_page: 2, total: 51 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    const checkbox = screen.getByRole("checkbox", { name: text.unansweredOnly });
    expect(checkbox).toBeChecked();
    await screen.findByText(contact.name);
    expect(screen.queryByText(answered.name)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(2, 2));
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    await screen.findByText(answered.name);
    expect(screen.getByText(text.page(1, 2))).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/site-management/contacts?page=1&perPage=50", expect.anything());
    fireEvent.click(checkbox);
    await waitFor(() => expect(screen.queryByText(answered.name)).not.toBeInTheDocument());
    expect(checkbox).toBeChecked();
    client.clear();
  });

  it.each(["019a1234-5678-7000-8000-777777777777", null])("shows pending when the latest reply is from another or unknown author: %s", async (latestAuthor) => {
    const replies = [
      { ...savedReply, replyNumber: 1, principalIdentifier: "019a1234-5678-7000-8000-666666666666" },
      { ...savedReply, replyNumber: 2, principalIdentifier: latestAuthor },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(page([{ ...contact, replies, replyIdentifiers: [identifier] }]))));
    const { client } = renderContacts();
    const summary = await screen.findByRole("button", { name: /Anonymous sender/ });
    expect(summary).toHaveTextContent(text.awaitingReply);
    expect(summary).not.toHaveTextContent(text.replied);
    client.clear();
  });

  it("distinguishes inquiries from the same sender by content, date and reply status", async () => {
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-333333333333", content: "A different inquiry from the same sender", createdAt: "2026-10-09T00:00:00+00:00", replyIdentifiers: [identifier], replies: [{ ...savedReply, principalIdentifier: "019a1234-5678-7000-8000-666666666666" }] };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("?")) return Response.json(page([contact, other]));
      return Response.json({ ...other, replies: [] });
    }));
    const { client } = renderContacts();
    const summaries = await screen.findAllByRole("button", { name: /Anonymous sender/ });
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toHaveTextContent(contact.content);
    expect(summaries[0]).toHaveTextContent(text.awaitingReply);
    expect(summaries[1]).toHaveTextContent(other.content);
    expect(summaries[1]).toHaveTextContent(text.replied);
    expect(summaries[1]).toHaveTextContent(new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short" }).format(new Date(other.createdAt)));
    fireEvent.click(summaries[1]);
    await screen.findByRole("textbox", { name: text.replyContent });
    expect(summaries[1]).toHaveAttribute("aria-expanded", "true");
    expect(summaries[0]).toHaveAttribute("aria-expanded", "false");
    expect(await screen.findByText(other.content, { selector: "p" })).toBeInTheDocument();
    client.clear();
  });

  it("keeps the conversation open in the full list after sending and identifies both sides", async () => {
    let replied = false;
    const owner = "019a1234-5678-7000-8000-444444444444";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) { replied = true; return new Response(null, { status: 204 }); }
      if (String(input).includes("?")) return Response.json(page());
      return Response.json({ ...detail, principalIdentifier: owner, replies: [
        { ...savedReply, replyIdentifier: "019a1234-5678-7000-8000-222222222222", content: "More details from the sender", principalIdentifier: owner, sentAt: null, createdAt: "2026-10-09T00:00:00+00:00" },
        ...(replied ? [{ ...savedReply, replyIdentifier: "019a1234-5678-7000-8000-333333333333", replyNumber: 2, createdAt: "2026-10-10T00:00:00+00:00", content: "Thanks, we will check", principalIdentifier: "019a1234-5678-7000-8000-555555555555", sentAt: "2026-10-10T00:00:00+00:00" }] : []),
      ] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    await screen.findByText(contact.name);
    fireEvent.click(screen.getByRole("checkbox", { name: text.unansweredOnly }));
    fireEvent.click(await screen.findByRole("button", { name: /Anonymous sender/ }));
    const composer = await screen.findByRole("textbox", { name: text.replyContent });
    fireEvent.change(composer, { target: { value: "Thanks, we will check" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByText("Thanks, we will check");
    const conversation = screen.getByRole("list", { name: dictionaries.ja.admin.contactConversation.label });
    const messages = within(conversation).getAllByRole("listitem");
    expect(messages).toHaveLength(3);
    expect(messages[0]).toHaveTextContent(contact.name);
    expect(messages[0]).toHaveTextContent(contact.content);
    expect(messages[1]).toHaveTextContent(contact.name);
    expect(messages[1]).toHaveTextContent("More details from the sender");
    expect(messages[2]).toHaveTextContent(dictionaries.ja.admin.contactConversation.operator);
    expect(messages[2]).toHaveTextContent("Thanks, we will check");
    expect(composer).toHaveValue("");
    client.clear();
  });

  it("uses creation time for a submitter reply without sentAt", async () => {
    const createdAt = "2026-10-10T12:00:00+00:00";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === listUrl ? page() : {
      ...detail,
      replies: [{ ...savedReply, replyIdentifier: identifier, content: "Additional information", sentAt: null, replyType: "submitter", createdAt }],
    })));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: /Anonymous sender|Other sender/ }));
    await screen.findByText("Additional information");
    expect(screen.getByText(new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short" }).format(new Date(createdAt)))).toBeInTheDocument();
    client.clear();
  });

  it("does not fetch or display contacts without view permission even on a direct URL", () => {
    mocks.actions = ["contact:reply"];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    expect(screen.queryByText(text.title)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    client.clear();
  });

  it("does not carry a failed reply draft into a different inquiry", async () => {
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-333333333333", name: "Other sender" };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (input === listUrl) return Response.json(page([contact, other]));
      if (input === replyUrl) return new Response(null, { status: 500 });
      return Response.json({ ...detail, contactIdentifier: String(input).split("/").at(-1) });
    }));
    const { client } = renderContacts();
    fireEvent.click((await screen.findAllByRole("button", { name: /Anonymous sender|Other sender/ }))[0]);
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Only for the first sender" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByText(text.replyFailed);
    fireEvent.click(screen.getByRole("button", { name: /Anonymous sender/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /Anonymous sender|Other sender/ })[1]);
    expect(await screen.findByRole("textbox", { name: text.replyContent })).toHaveValue("");
    expect(screen.queryByText(text.replyFailed)).not.toBeInTheDocument();
    client.clear();
  });

  it("prevents changing the selected inquiry while its reply is pending", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (input === listUrl) return Promise.resolve(Response.json(page()));
      if (input === detailUrl) return Promise.resolve(Response.json(detail));
      return new Promise<Response>((done) => { resolve = done; });
    }));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: /Anonymous sender|Other sender/ }));
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Reply" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByRole("button", { name: text.replying });
    const opener = screen.getByRole("button", { name: /Anonymous sender/ });
    expect(opener).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: text.unansweredOnly })).toBeDisabled();
    fireEvent.click(opener);
    expect(opener).toHaveAttribute("aria-expanded", "true");
    resolve(new Response(null, { status: 500 }));
    await screen.findByText(text.replyFailed);
    expect(screen.getByRole("button", { name: /Anonymous sender/ })).toBeEnabled();
    client.clear();
  });

  it("toggles inline details from the summary while retaining focus", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === listUrl ? page() : detail)));
    const { client } = renderContacts();
    const opener = await screen.findByRole("button", { name: /Anonymous sender|Other sender/ });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole("textbox", { name: text.replyContent });
    expect(opener).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(opener);
    expect(opener).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("textbox", { name: text.replyContent })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    client.clear();
  });

  it("hides cached list entries after a forbidden background refresh", async () => {
    let forbidden = false;
    vi.stubGlobal("fetch", vi.fn(async () => forbidden ? new Response(null, { status: 403 }) : Response.json(page())));
    const { client } = renderContacts();
    await screen.findByRole("button", { name: /Anonymous sender|Other sender/ });
    forbidden = true;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contacts"] });
    await screen.findByText(text.loadFailed);
    expect(screen.queryByRole("button", { name: /Anonymous sender|Other sender/ })).not.toBeInTheDocument();
    expect(screen.queryByText(contact.name)).not.toBeInTheDocument();
    client.clear();
  });

  it("hides cached detail and the reply form when a detail refresh is forbidden", async () => {
    let forbidden = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => input === listUrl
      ? Response.json(page())
      : forbidden ? new Response(null, { status: 403 }) : Response.json(detail)));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: /Anonymous sender|Other sender/ }));
    await screen.findByText(detail.content, { selector: "p" });
    forbidden = true;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contact"] });
    await screen.findByText(text.detailLoadFailed);
    expect(screen.queryByText(detail.content, { selector: "p" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: text.replyContent })).not.toBeInTheDocument();
    client.clear();
  });

  it("returns to an existing page after replying to the last contact on the last page", async () => {
    let replied = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) { replied = true; return new Response(null, { status: 204 }); }
      if (input === detailUrl) return Response.json(detail);
      const currentPage = Number(new URL(String(input), window.location.origin).searchParams.get("page"));
      return Response.json({ ...page(replied && currentPage === 2 ? [] : [contact]), current_page: currentPage, last_page: replied ? 1 : 2, total: replied ? 50 : 51 });
    }));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(2, 2));
    fireEvent.click(screen.getByRole("button", { name: /Anonymous sender|Other sender/ }));
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Reply" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await waitFor(() => expect(screen.queryByRole("textbox", { name: text.replyContent })).not.toBeInTheDocument());
    await waitFor(() => expect(client.getQueryCache().find({ queryKey: ["admin", "siteManagement", "contacts", "operator", 2, true, "019a1234-5678-7000-8000-666666666666"] })?.getObserversCount()).toBe(0));
    await waitFor(() => expect(client.getQueryData<{ current_page: number }>(["admin", "siteManagement", "contacts", "operator", 1, true, "019a1234-5678-7000-8000-666666666666"])?.current_page).toBe(1));
    await waitFor(() => expect(screen.queryByText(text.empty)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Anonymous sender|Other sender/ })).toBeInTheDocument();
    client.clear();
  });

  it("opens an anonymous inquiry, replies using its identifier, and refreshes the unanswered list", async () => {
    let replied = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === listUrl) return Response.json(page(replied ? [] : [contact]));
      if (input === detailUrl) return Response.json(detail);
      if (input === replyUrl && init?.method === "POST") {
        replied = true;
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    const open = await screen.findByRole("button", { name: /Anonymous sender|Other sender/ });
    expect(open).toBeEnabled();
    fireEvent.click(open);
    expect(await screen.findByText(detail.content, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: dictionaries.ja.admin.contactConversation.label })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(detailUrl, expect.objectContaining({ credentials: "include", cache: "no-store" }));
    const send = screen.getByRole("button", { name: text.reply });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: text.replyContent }), { target: { value: "Mail reply" } });
    fireEvent.click(send);
    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: text.replyContent })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(replyUrl, expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ content: "Mail reply" }),
      headers: expect.objectContaining({ "X-XSRF-TOKEN": "test-csrf" }),
    }));
    expect(fetchMock.mock.calls.filter(([url]) => url === listUrl)).toHaveLength(2);
    client.clear();
  });

  it("shows anonymous detail and sent replies read-only without reply permission", async () => {
    mocks.actions = ["contact:view"];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === listUrl) return Response.json(page());
      if (input === detailUrl) return Response.json({ ...detail, replies: [{ ...savedReply, replyIdentifier: "019a1234-5678-7000-8000-222222222222", content: "Earlier sent reply", sentAt: "2026-10-09T00:00:00+00:00" }] });
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: /Anonymous sender|Other sender/ }));
    expect(await screen.findByText("Earlier sent reply")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: text.replyContent })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: text.reply })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Anonymous sender/ }));
    expect(screen.queryByRole("textbox", { name: text.replyContent })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === replyUrl)).toBe(false);
    client.clear();
  });

  it("shows list loading until the unanswered page arrives", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const { client } = renderContacts();
    expect(screen.getByText(text.loading)).toBeInTheDocument();
    resolve(Response.json(page([])));
    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    expect(screen.queryByText(text.loading)).not.toBeInTheDocument();
    client.clear();
  });

  it("shows a list error rather than an empty state when loading is forbidden", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    const { client } = renderContacts();
    expect(await screen.findByText(text.loadFailed)).toBeInTheDocument();
    expect(screen.queryByText(text.empty)).not.toBeInTheDocument();
    client.clear();
  });

  it("shows anonymous detail loading and an error without exposing the reply form", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => input === listUrl
      ? Promise.resolve(Response.json(page()))
      : new Promise<Response>((done) => { resolve = done; })));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: /Anonymous sender|Other sender/ }));
    expect(screen.getByText(text.detailLoading)).toBeInTheDocument();
    resolve(new Response(null, { status: 404 }));
    expect(await screen.findByText(text.detailLoadFailed)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: text.replyContent })).not.toBeInTheDocument();
    client.clear();
  });

  it("keeps the anonymous inquiry and reply draft on mail delivery failure", async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (input === listUrl) return Promise.resolve(Response.json(page()));
      if (input === detailUrl) return Promise.resolve(Response.json(detail));
      if (input === replyUrl) return new Promise<Response>((done) => { resolve = done; });
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: /Anonymous sender|Other sender/ }));
    const input = await screen.findByRole("textbox", { name: text.replyContent });
    fireEvent.change(input, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: text.reply })).toBeDisabled();
    fireEvent.change(input, { target: { value: "Retry this reply" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    expect(await screen.findByRole("button", { name: text.replying })).toBeDisabled();
    expect(input).toBeDisabled();
    resolve(new Response(null, { status: 500 }));
    expect(await screen.findByText(text.replyFailed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anonymous sender/, expanded: true })).toBeInTheDocument();
    expect(input).toHaveValue("Retry this reply");
    expect(input).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([url]) => url === listUrl)).toHaveLength(1);
    client.clear();
  });

  it("requests the next unanswered page and disables paging at each boundary", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const currentPage = new URL(String(input), window.location.origin).searchParams.get("page");
      return Response.json({ ...page(), current_page: Number(currentPage), last_page: 2, total: 51 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    expect(await screen.findByRole("button", { name: text.previousPage })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: text.nextPage }));
    expect(await screen.findByText(text.page(2, 2))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: text.nextPage })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith("/api/site-management/contacts?replyStatus=pending&page=2&perPage=50", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: text.previousPage }));
    await waitFor(() => expect(screen.getByRole("button", { name: text.previousPage })).toBeDisabled());
    client.clear();
  });
});
