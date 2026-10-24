import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { SiteManagementPageClient } from "../SiteManagementPageClient";
import { SiteManagementContactsClient } from "./SiteManagementContactsClient";

const mocks = vi.hoisted(() => ({ pathname: "/admin/site-management/contacts/manage", search: "", replace: vi.fn(), push: vi.fn(), ownOnly: false, locale: "ja" as "ja" | "en" | "ko" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useSearchParams: () => new URLSearchParams(mocks.search), useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }));
vi.mock("../../AdminProvider", () => ({ useAdmin: () => ({ locale: mocks.locale, t: dictionaries[mocks.locale].admin, currentIdentity: { accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", identityIdentifier: "actor", accountIdentifier: "account", siteManagementPrincipalIdentifier: "principal", account: { status: "active" }, siteManagementPolicies: [{ name: "Viewer", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["contact:view", "contact:reply"], resourceTypes: ["contact"], condition: mocks.ownOnly ? "own_contact" : null }] }] } }) }));
vi.mock("@/i18n/I18nProvider", () => ({ useI18n: () => ({ locale: mocks.locale, dictionary: dictionaries[mocks.locale] }) }));
const id = "11111111-1111-4111-8111-111111111111";
const contact = { contactIdentifier: id, principalIdentifier: id, name: "山田花子", content: "画面を確認してください。", category: 1, replyIdentifiers: [] as string[], createdAt: "2026-10-01T10:00:00+09:00" };
const text = dictionaries.ja.admin.siteManagementContacts;
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  const element = () => <QueryClientProvider client={client}><SiteManagementPageClient><SiteManagementContactsClient /></SiteManagementPageClient></QueryClientProvider>;
  const view = render(element());
  return { ...view, navigate: (path: string) => { const url = new URL(path, "http://localhost"); mocks.pathname = url.pathname; mocks.search = url.search; view.rerender(element()); } };
}
function api() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.endsWith("/me")) return Response.json([contact]);
    if (url.pathname.endsWith(id)) return Response.json({ ...contact, replies: [] });
    const page = Number(url.searchParams.get("page"));
    return Response.json({ contacts: [contact], current_page: page, last_page: 3, total: 101, per_page: 50 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
beforeEach(() => { mocks.pathname = "/admin/site-management/contacts/manage"; mocks.search = ""; mocks.ownOnly = false; mocks.locale = "ja"; mocks.replace.mockReset(); mocks.push.mockReset(); vi.stubGlobal("scrollTo", vi.fn()); });
afterEach(() => { cleanup(); client?.clear(); vi.unstubAllGlobals(); });
describe("own and management contact tabs", () => {
  it.each(["", "isPending=1"])("keeps the management heading and right-aligned filter in one wrapping row (filter=%s)", async (search) => {
    mocks.search = search;
    api(); mount();
    await screen.findByText(contact.name);
    const heading = screen.getByRole("heading", { level: 2, name: text.title });
    const checkbox = screen.getByRole("checkbox", { name: text.unansweredOnly });
    const label = checkbox.closest("label")!;
    const row = heading.parentElement!;
    expect(row).toHaveClass("flex", "flex-wrap", "items-center", "gap-x-3", "gap-y-2");
    expect(Array.from(row.children)).toEqual([heading, label]);
    expect(heading).toHaveClass("shrink-0");
    expect(label).toHaveClass("ml-auto", "flex", "shrink-0", "items-center", "gap-2", "whitespace-nowrap");
    const description = screen.getByText(search ? text.description : text.allDescription);
    expect(description.tagName).toBe("P");
    expect(Array.from(row.parentElement!.children)).toEqual([row, description]);
    expect(row.closest("header")).not.toContainElement(screen.getByRole("tab", { name: text.title }));
    expect(checkbox).toHaveProperty("checked", search === "isPending=1");
    fireEvent.click(label);
    expect(mocks.push).toHaveBeenCalledWith(`/admin/site-management/contacts/manage${search ? "" : "?isPending=1"}`, { scroll: false });
  });
  it.each(["/admin/site-management", "/admin/site-management/", "/admin/site-management/contacts"])("uses only own API on the default route %s even for administrators", async (pathname) => {
    mocks.pathname = pathname;
    const fetchMock = api();
    mount();
    await screen.findByText(contact.name);
    expect(screen.getByRole("tab", { name: dictionaries.ja.admin.myContacts.title })).toHaveAttribute("aria-selected", "true");
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["/api/site-management/contact/me"]);
  });
  it("refreshes own reply counts and history after replying to oneself with infinitely fresh own caches", async () => {
    let replied = false;
    const reply = { replyIdentifier: id, content: "対応が完了しました。", sentAt: contact.createdAt };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      const summary = { ...contact, replyIdentifiers: replied ? [id] : [] };
      if (path.endsWith("/replies")) { replied = true; return new Response(null, { status: 204 }); }
      if (path.endsWith("/me")) return Response.json([summary]);
      if (path.endsWith(id)) return Response.json({ ...summary, replies: replied ? [reply] : [] });
      return Response.json({ contacts: [summary], current_page: 1, last_page: 1, total: 1, per_page: 50 });
    });
    vi.stubGlobal("fetch", fetchMock);
    mocks.pathname = "/admin/site-management/contacts";
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: /山田花子/ }));
    await screen.findByText(dictionaries.ja.admin.myContacts.noReplies);
    fireEvent.click(screen.getByRole("button", { name: text.close }));
    view.navigate("/admin/site-management/contacts/manage");
    fireEvent.click(await screen.findByRole("button", { name: /山田花子/ }));
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: reply.content } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(client.getQueryState(["myContacts", "actor", "account", "principal", id])?.isInvalidated).toBe(true));
    view.navigate("/admin/site-management/contacts");
    const card = await screen.findByRole("button", { name: /返信1件/ });
    fireEvent.click(card);
    await within(screen.getByRole("dialog")).findByText(reply.content);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/me"))).toHaveLength(2);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === `/api/site-management/contact/me/${id}`)).toHaveLength(2);
  });
  it.each([204, 500])("preserves the in-flight reply dialog and target during browser-back filter changes (reply status %s)", async (status) => {
    let resolve!: (response: Response) => void;
    const fetchMock = api();
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input) => String(input).endsWith("/replies") ? new Promise<Response>((done) => { resolve = done; }) : normal(input));
    mocks.search = "isPending=1";
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: /山田花子/ }));
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "元のお問い合わせへの返信" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByRole("button", { name: text.replying });
    const dialog = screen.getByRole("dialog");
    view.navigate("/admin/site-management/contacts/manage");
    await waitFor(() => expect(screen.getByRole("checkbox")).not.toBeChecked());
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("textbox")).toHaveValue("元のお問い合わせへの返信");
    expect(within(dialog).getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    resolve(new Response(null, { status }));
    if (status === 204) await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    else {
      await within(dialog).findByText(text.replyFailed);
      expect(within(dialog).getByRole("textbox")).toHaveValue("元のお問い合わせへの返信");
      expect(within(dialog).getByRole("textbox")).not.toBeDisabled();
    }
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/replies")).map(([url]) => url)).toEqual([`/api/site-management/contacts/${id}/replies`]);
  });
  it.each(["", "isPending=1"])("disables background pagination while sending a reply (filter=%s)", async (search) => {
    mocks.search = search;
    let resolve!: (response: Response) => void;
    const fetchMock = api();
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input) => String(input).endsWith("/replies") ? new Promise<Response>((done) => { resolve = done; }) : normal(input));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(2, 3));
    fireEvent.click(screen.getByRole("button", { name: /山田花子/ }));
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "確認しました。" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByRole("button", { name: text.replying });
    for (const name of [text.previousPage, text.nextPage]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(screen.getByText(text.page(2, 3))).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("page=3"))).toBe(false);
    resolve(new Response(null, { status: 500 }));
    await screen.findByText(text.replyFailed);
    expect(screen.getByRole("button", { name: text.previousPage })).toBeEnabled();
    expect(screen.getByRole("button", { name: text.nextPage })).toBeEnabled();
  });
  it.each([401, 403])("hides stale management data and falls back to the own tab after %s on any management request", async (status) => {
    let deniedPath = "";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === deniedPath) return Response.json({}, { status });
      if (path.endsWith("/me")) return Response.json([contact]);
      if (path.endsWith(id)) return Response.json({ ...contact, content: "管理専用の詳細", replies: [] });
      return Response.json({ contacts: [contact], current_page: 1, last_page: 1, total: 1, per_page: 50 });
    });
    vi.stubGlobal("fetch", fetchMock);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /山田花子/ }));
    await screen.findByText("管理専用の詳細");
    deniedPath = `/api/site-management/contacts/${id}`;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contact"] });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/admin/site-management/contacts"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("管理専用の詳細")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await screen.findByRole("combobox");
  });
  it("invalidates current own list/detail as well as both management filters after a reply, and blocks filter changes while sending", async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = api();
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input) => String(input).endsWith("/replies") ? new Promise<Response>((done) => { resolve = done; }) : normal(input));
    mount();
    const ownKey = ["myContacts", "actor", "account", "principal"];
    client.setQueryData(ownKey, [contact]);
    client.setQueryData([...ownKey, id], { ...contact, replies: [] });
    client.setQueryData(["myContacts", "other", "account", "principal"], [contact]);
    const managementKey = ["admin", "siteManagement", "contacts", "actor", "account", "principal", null];
    client.setQueryData([...managementKey, "pending", 1], { contacts: [contact] });
    fireEvent.click(await screen.findByRole("button", { name: /山田花子/ }));
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "確認しました。" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByRole("button", { name: text.replying });
    expect(screen.getByRole("checkbox")).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(mocks.push).not.toHaveBeenCalled();
    resolve(new Response(null, { status: 204 }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(client.getQueryState(ownKey)?.isInvalidated).toBe(true));
    expect(client.getQueryState([...ownKey, id])?.isInvalidated).toBe(true);
    expect(client.getQueryState([...managementKey, "pending", 1])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["myContacts", "other", "account", "principal"])?.isInvalidated).toBe(false);
  });
  it.each(["ja", "en", "ko"] as const)("separates both tab titles and APIs for an administrator in %s", async (locale) => {
    mocks.locale = locale;
    const fetchMock = api();
    const view = mount();
    await screen.findByText(contact.name);
    const t = dictionaries[locale].admin;
    expect(screen.getByRole("tab", { name: t.myContacts.title })).toHaveAttribute("href", "/admin/site-management/contacts");
    expect(screen.getByRole("tab", { name: t.siteManagementContacts.title })).toHaveAttribute("href", "/admin/site-management/contacts/manage");
    expect(screen.getByRole("heading", { name: t.siteManagementContacts.title })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    view.navigate("/admin/site-management/contacts");
    await screen.findByRole("combobox");
    expect(screen.getByRole("heading", { name: t.myContacts.title })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["/api/site-management/contacts?page=1&perPage=50", "/api/site-management/contact/me"]);
  });
  it.each([false, true])("redirects the legacy route without calling management APIs (ownOnly=%s)", (ownOnly) => {
    mocks.ownOnly = ownOnly;
    mocks.pathname = "/admin/site-management/contacts/unanswered";
    const fetchMock = api(); mount();
    expect(mocks.replace).toHaveBeenCalledWith(ownOnly ? "/admin/site-management/contacts" : "/admin/site-management/contacts/manage?isPending=1");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("gates the direct management URL and falls back to own contacts for an own-only viewer", async () => {
    mocks.ownOnly = true;
    const fetchMock = api(); mount();
    expect(mocks.replace).toHaveBeenCalledWith("/admin/site-management/contacts");
    await screen.findByText(contact.name);
    expect(screen.queryByRole("tab", { name: text.title })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(["/api/site-management/contact/me"]);
  });
  it.each(["isPending=1", "isPending=0", "isPending=", "isPending=false", "isPending=1&isPending=1", "isPending=1&isPending=0", "hasReply=0"])("validates the management URL condition %s", async (search) => {
    mocks.search = search;
    const fetchMock = api(); mount();
    await screen.findByText(contact.name);
    const active = search === "isPending=1";
    expect(screen.getByRole("checkbox")).toHaveProperty("checked", active);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/site-management/contacts?${active ? "isPending=1&" : ""}page=1&perPage=50`);
  });
  it("writes only the explicit checkbox condition and resets to page one on changes and browser navigation", async () => {
    const fetchMock = api(); const view = mount();
    await screen.findByText(contact.name);
    fireEvent.click(screen.getByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(2, 3));
    fireEvent.click(screen.getByRole("checkbox", { name: "未対応のみ" }));
    expect(mocks.push).toHaveBeenCalledWith("/admin/site-management/contacts/manage?isPending=1", { scroll: false });
    view.navigate("/admin/site-management/contacts/manage?isPending=1");
    await screen.findByText(text.page(1, 3));
    expect(fetchMock).toHaveBeenCalledWith("/api/site-management/contacts?isPending=1&page=1&perPage=50", expect.anything());
    fireEvent.click(screen.getByRole("checkbox"));
    expect(mocks.push).toHaveBeenLastCalledWith("/admin/site-management/contacts/manage", { scroll: false });
    fireEvent.click(screen.getByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(2, 3));
    view.navigate("/admin/site-management/contacts/manage");
    await screen.findByText(text.page(1, 3));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(client.getQueryData(["admin", "siteManagement", "contacts", "actor", "account", "principal", null, "all", 2])).toMatchObject({ current_page: 2 });
    expect(client.getQueryData(["admin", "siteManagement", "contacts", "actor", "account", "principal", null, "pending", 2])).toMatchObject({ current_page: 2 });
  });
  it("changes only the background filter while keeping the sender list unfiltered", async () => {
    const fetchMock = api(); const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: /山田花子/ }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    await within(screen.getByRole("dialog")).findByText(contact.name);
    view.navigate("/admin/site-management/contacts/manage?isPending=1");
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("principalIdentifier=")).map(([url]) => String(url))).toEqual([`/api/site-management/contacts?page=1&perPage=50&principalIdentifier=${id}`]);
  });
});
