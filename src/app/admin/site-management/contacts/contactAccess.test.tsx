import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { SiteManagementContactsClient } from "./SiteManagementContactsClient";

const mocks = vi.hoisted(() => ({ pathname: "/admin/site-management/contacts", identity: {} as Record<string, unknown>, replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("../../AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: mocks.identity, locale: "ja", t: dictionaries.ja.admin }) }));
vi.mock("@/i18n/I18nProvider", () => ({ useI18n: () => ({ dictionary: dictionaries.ja }) }));
const statement = { effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" as string | null };
const identity = { accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", identityIdentifier: "actor", accountIdentifier: "account", account: { status: "active" }, siteManagementPrincipalIdentifier: "principal", siteManagementPolicies: [{ policyIdentifier: "policy", name: "Not a role", statements: [statement] }] };
const contact = { contactIdentifier: "11111111-1111-4111-8111-111111111111", principalIdentifier: null, category: 1, name: "山田花子", content: "本人のお問い合わせ", createdAt: "2026-10-01T10:00:00+09:00", replyIdentifiers: [] };
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  const element = () => <QueryClientProvider client={client}><SiteManagementContactsClient /></QueryClientProvider>;
  const view = render(element());
  return { ...view, refresh: () => view.rerender(element()) };
}
beforeEach(() => { mocks.identity = identity; mocks.pathname = "/admin/site-management/contacts"; });
afterEach(() => { cleanup(); client?.clear(); vi.unstubAllGlobals(); });
describe("shared contact tab dispatch", () => {
  it("hides an open admin detail and sender controls when its list authorization is lost", async () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.identity = { ...identity, siteManagementPolicies: [{ ...identity.siteManagementPolicies[0], statements: [{ ...statement, condition: null }] }] };
    vi.stubGlobal("scrollTo", vi.fn());
    let denied = false;
    vi.stubGlobal("fetch", vi.fn(async (url) => String(url).includes("?")
      ? denied ? Response.json({}, { status: 403 }) : Response.json({ contacts: [contact], current_page: 1, last_page: 1, total: 1, per_page: 50 })
      : Response.json({ ...contact, content: "非公開の詳細本文", principalIdentifier: contact.contactIdentifier, replies: [] })));
    mount();
    fireEvent.click(await screen.findByRole("button"));
    await screen.findByText("非公開の詳細本文");
    denied = true;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contacts"] });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("非公開の詳細本文")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: dictionaries.ja.admin.siteManagementContacts.viewSenderContacts })).not.toBeInTheDocument();
  });
  it.each(["identityIdentifier", "accountIdentifier", "siteManagementPrincipalIdentifier"])("separates admin caches when %s changes", async (field) => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    const actor = { ...identity, siteManagementPolicies: [{ ...identity.siteManagementPolicies[0], statements: [{ ...statement, condition: null }] }] };
    mocks.identity = actor;
    let switched = false;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ contacts: [{ ...contact, content: switched ? "切替後の管理者一覧" : "切替前の管理者一覧" }], current_page: 1, last_page: 1, total: 1, per_page: 50 })));
    const view = mount();
    await screen.findByText("切替前の管理者一覧");
    switched = true;
    mocks.identity = { ...actor, [field]: "new-value" };
    view.refresh();
    expect(screen.queryByText("切替前の管理者一覧")).not.toBeInTheDocument();
    await screen.findByText("切替後の管理者一覧");
  });
  it("calls only own-list for an own-contact policy regardless of policy name", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([contact])); vi.stubGlobal("fetch", fetchMock);
    mount();
    expect(await screen.findByText(contact.content)).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/site-management/contact/me"]);
  });
  it("uses only the readonly own API even for an unrestricted administrator on the own tab", async () => {
    mocks.identity = { ...identity, siteManagementPolicies: [{ ...identity.siteManagementPolicies[0], statements: [{ ...statement, condition: null }] }] };
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json([contact]));
    vi.stubGlobal("fetch", fetchMock);
    mount();
    expect(await screen.findByText(contact.content)).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/site-management/contact/me"]);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("does not call any API on an own-viewer's unanswered direct URL", () => {
    mocks.pathname = "/admin/site-management/contacts/unanswered";
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    mount();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
  it.each([null, { ...identity, account: { status: "pending" } }, { ...identity, account: { status: "suspended" } }, { ...identity, siteManagementPolicies: [] }])("rejects an unauthorized actor without calling either API: %j", (actor) => {
    mocks.identity = actor as unknown as Record<string, unknown>;
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const view = mount();
    mocks.pathname = "/admin/site-management/contacts/manage";
    view.refresh();
    mocks.pathname = "/admin/site-management/contacts/unanswered";
    view.refresh();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("switches admin to own API without showing cached admin content or replies", async () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.identity = { ...identity, siteManagementPolicies: [{ ...identity.siteManagementPolicies[0], statements: [{ ...statement, condition: null }] }] };
    const adminContact = { ...contact, content: "他人の非公開問い合わせ" };
    const fetchMock = vi.fn(async (url) => Response.json(String(url).includes("/contact/me") ? [contact] : { contacts: [adminContact], current_page: 1, last_page: 1, total: 1, per_page: 50 }));
    vi.stubGlobal("fetch", fetchMock);
    const view = mount();
    await screen.findByText(adminContact.content);
    mocks.identity = identity;
    view.refresh();
    expect(screen.queryByText(adminContact.content)).not.toBeInTheDocument();
    await screen.findByText(contact.content);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/site-management/contacts?page=1&perPage=50", "/api/site-management/contact/me"]);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "replied" } });
    expect(screen.queryByText(contact.content)).not.toBeInTheDocument();
  });
});
