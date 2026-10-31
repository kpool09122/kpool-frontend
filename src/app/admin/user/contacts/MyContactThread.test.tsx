import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "@/i18n/dictionaries";
import { MyContactsClient } from "./MyContactsClient";

const mocks = vi.hoisted(() => ({ allowed: true, active: true }));
const principal = "019a1234-5678-7000-8000-111111111111";
vi.mock("@/i18n/I18nProvider", () => ({ useI18n: () => ({ dictionary: dictionaries.ja, locale: "ja" }) }));
vi.mock("../../AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: {
  identityIdentifier: "member", accountIdentifier: "account", accountPrincipalStatus: "active",
  siteManagementPrincipalStatus: mocks.active ? "active" : "suspended", account: { status: "active" },
  siteManagementPrincipalIdentifier: "019a1234-5678-7000-8000-111111111111",
  siteManagementPolicies: [{ policyIdentifier: "general", name: "General", statements: [
    { effect: mocks.allowed ? "allow" : "deny", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" },
  ] }],
} }) }));

const contact = {
  contactIdentifier: "019a1234-5678-7000-8000-222222222222", principalIdentifier: principal,
  category: 1, name: "Member", content: "My inquiry", createdAt: "2026-10-08T00:00:00+00:00",
  replyIdentifiers: [] as string[], replies: [],
};
const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-333333333333", content: "Other inquiry" };
const base = "/api/site-management/contact/me";
const detailUrl = `${base}/${contact.contactIdentifier}`;
const replyUrl = `${detailUrl}/replies`;
const text = dictionaries.ja.admin.contactConversation;
const savedReply = {
  replyIdentifier: "019a1234-5678-7000-8000-444444444444", principalIdentifier: principal,
  name: "Member", replyNumber: 1, content: "My follow-up", sentAt: null, createdAt: "2026-10-09T00:00:00+00:00",
};

function renderContacts() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData(["myContacts", "member"], [contact, other]);
  render(<QueryClientProvider client={client}><MyContactsClient /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: /My inquiry/ }));
  return client;
}

beforeEach(() => { mocks.allowed = true; mocks.active = true; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("submitter replies from contact history", () => {
  it("lets a General principal reply, prevents duplicate sends and refreshes the open conversation", async () => {
    let complete!: (response: Response) => void;
    let saved = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) return new Promise<Response>((resolve) => { complete = (response) => { saved = true; resolve(response); }; });
      if (input === base) return Response.json([{ ...contact, replyIdentifiers: [savedReply.replyIdentifier] }, other]);
      return Response.json({ ...contact, replies: saved ? [{ ...savedReply, sentAt: savedReply.createdAt }] : [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = renderContacts();
    const input = await screen.findByRole("textbox", { name: text.replyContent });
    const send = screen.getByRole("button", { name: text.reply });
    expect(send).toBeDisabled();
    fireEvent.change(input, { target: { value: "   " } });
    expect(send).toBeDisabled();
    fireEvent.change(input, { target: { value: "My follow-up" } });
    fireEvent.click(send);
    await screen.findByRole("button", { name: text.replying });
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: /Other inquiry/ })).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    fireEvent.click(send);
    expect(fetchMock.mock.calls.filter(([url]) => url === replyUrl)).toHaveLength(1);
    complete(new Response(null, { status: 204 }));
    await screen.findByText("My follow-up");
    await waitFor(() => expect(input).toBeEnabled());
    expect(input).toHaveValue("");
    const messages = within(screen.getByRole("list", { name: text.label })).getAllByRole("listitem");
    expect(messages[1]).toHaveTextContent(text.you);
    expect(screen.getByRole("button", { name: /My inquiry/ })).toHaveAttribute("aria-expanded", "true");
    expect(fetchMock).toHaveBeenCalledWith(replyUrl, expect.objectContaining({
      method: "POST", body: JSON.stringify({ content: "My follow-up" }),
      headers: expect.objectContaining({ "X-XSRF-TOKEN": "test-csrf-token" }),
    }));
    client.clear();
  });

  it("reconciles a saved reply after notification failure without inviting a duplicate send", async () => {
    let saved = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) { saved = true; return Response.json({ message: "Mail failed" }, { status: 500 }); }
      if (input === base) return Response.json([contact, other]);
      return Response.json({ ...contact, replies: saved ? [savedReply] : [] });
    }));
    const client = renderContacts();
    const input = await screen.findByRole("textbox", { name: text.replyContent });
    fireEvent.change(input, { target: { value: savedReply.content } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByText(text.replySavedNotificationFailed);
    expect(input).toHaveValue("");
    expect(screen.getByRole("button", { name: text.reply })).toBeDisabled();
    const message = screen.getByText(savedReply.content).closest("li")!;
    expect(message).toHaveTextContent(text.you);
    expect(within(message).getByText((_, element) => element?.tagName === "TIME").getAttribute("datetime")).toBe(savedReply.createdAt);
    client.clear();
  });

  it("retains an unsaved reply after failure and clears it when another inquiry is opened", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) return Response.json({ message: "Unavailable" }, { status: 500 });
      if (input === base) return Response.json([contact, other]);
      return Response.json(input === detailUrl ? contact : other);
    }));
    const client = renderContacts();
    const input = await screen.findByRole("textbox", { name: text.replyContent });
    fireEvent.change(input, { target: { value: "Unsaved draft" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByText(text.replyFailed);
    expect(input).toHaveValue("Unsaved draft");
    expect(input).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Other inquiry/ }));
    expect(await screen.findByRole("textbox", { name: text.replyContent })).toHaveValue("");
    expect(screen.queryByText(text.replyFailed)).not.toBeInTheDocument();
    client.clear();
  });

  it.each(["anonymous", "other-owner", "denied", "suspended"])("does not offer a reply form for %s", async (scenario) => {
    mocks.allowed = scenario !== "denied";
    mocks.active = scenario !== "suspended";
    const owner = scenario === "anonymous" ? null : scenario === "other-owner" ? other.contactIdentifier : principal;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...contact, principalIdentifier: owner })));
    const client = renderContacts();
    await screen.findByRole("list", { name: text.label });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    client.clear();
  });

  it("hides cached conversation and composer when a post-send refresh is forbidden", async () => {
    let forbidden = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) { forbidden = true; return new Response(null, { status: 403 }); }
      if (input === base) return Response.json([contact, other]);
      return forbidden ? Response.json({ message: "Permission lost" }, { status: 403 }) : Response.json(contact);
    }));
    const client = renderContacts();
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Follow-up" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByText("Permission lost");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: text.label })).not.toBeInTheDocument();
    client.clear();
  });
});
