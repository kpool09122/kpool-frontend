import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { MyContactsClient } from "./MyContactsClient";

const mocks = vi.hoisted(() => ({ actor: "user", locale: "ja" as "ja" | "en" | "ko" }));
vi.mock("../../AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: { identityIdentifier: mocks.actor, accountIdentifier: "account", siteManagementPrincipalIdentifier: "principal", accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", account: { status: "active" }, siteManagementPolicies: [{ statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" }] }] } }) }));
vi.mock("../../../../i18n/I18nProvider", () => ({ useI18n: () => ({ dictionary: dictionaries[mocks.locale], locale: mocks.locale }) }));
const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const contact = { contactIdentifier: id, principalIdentifier: "33333333-3333-4333-8333-333333333333", category: 1, name: "利用者", content: "お問い合わせ本文", createdAt: "2026-10-01T00:00:00Z", replyIdentifiers: [otherId] };
const operator = { replyIdentifier: otherId, replyType: "operator", content: "運営の回答", sentAt: "2026-10-02T00:00:00Z", createdAt: "2026-10-01T00:00:00Z" };
const post = { replyIdentifier: "44444444-4444-4444-8444-444444444444", replyType: "submitter", content: "追加情報です", createdAt: "2026-10-03T00:00:00Z", sentAt: null };
const detailUrl = `/api/site-management/contact/me/${id}`;
const text = dictionaries.ja.admin.siteManagementContacts;
const copy = () => ({ ...dictionaries[mocks.locale].admin.myContacts, ...dictionaries[mocks.locale].admin.myContactReply });
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: 3 } } });
  const element = () => <QueryClientProvider client={client}><MyContactsClient /></QueryClientProvider>;
  const view = render(element());
  return { ...view, refresh: () => view.rerender(element()) };
}
function api(postReply: () => Promise<Response> = async () => new Response(null, { status: 204 }), getReplies: () => unknown[] = () => [operator], afterPostDetail?: () => Promise<Response>) {
  let posted = false;
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") { posted = true; return postReply(); }
    if (String(input).endsWith("/me")) return Response.json([contact, { ...contact, contactIdentifier: otherId, name: "別の問い合わせ" }]);
    if (posted && afterPostDetail) return afterPostDetail();
    return Response.json({ ...contact, replies: getReplies() });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
async function open() { fireEvent.click(await screen.findByRole("button", { name: /利用者/ })); await screen.findByText(operator.content); }
async function send() {
  fireEvent.change(await screen.findByRole("textbox"), { target: { value: post.content } });
  fireEvent.submit(screen.getByRole("textbox").closest("form")!);
}
beforeEach(() => { mocks.actor = "user"; mocks.locale = "ja"; vi.stubGlobal("scrollTo", vi.fn()); });
afterEach(() => { cleanup(); client?.clear(); vi.unstubAllGlobals(); });
describe("own contact replies", () => {
  it.each(["ja", "en", "ko"] as const)("shows a content-only reply form after successful operator reply in %s", async (locale) => {
    mocks.locale = locale; const fetchMock = api(); mount(); await open();
    expect(screen.getByRole("textbox", { name: dictionaries[locale].admin.siteManagementContacts.replyContent })).toHaveClass("min-h-48");
    expect(screen.getByRole("textbox")).not.toHaveAttribute("maxlength");
    await send();
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toEqual([[`${detailUrl}/replies`, expect.objectContaining({ body: JSON.stringify({ content: post.content }), headers: expect.objectContaining({ "Accept-Language": locale, "X-XSRF-TOKEN": "test-csrf-token" }) })]]);
  });
  it.each([{ replies: [] }, { replies: [{ ...operator, sentAt: null }] }, { replies: [{ ...operator, replyType: "submitter" }] }])("does not offer replies without a successful operator entry %j", async ({ replies }) => {
    api(undefined, () => replies); mount(); fireEvent.click(await screen.findByRole("button", { name: /利用者/ }));
    await screen.findByText(contact.content, { selector: "dialog p" });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("locks the form, close/escape, other cards and filters until the request and refresh settle, with no duplicate POST", async () => {
    let resolve!: (r: Response) => void;
    const fetchMock = api(() => new Promise((done) => { resolve = done; }));
    mount(); await open(); await send();
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: copy().close })).toBeDisabled();
    expect(screen.getByRole("button", { name: /別の問い合わせ/ })).toBeDisabled();
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1));
    await act(async () => resolve(new Response(null, { status: 204 })));
    await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
  });
  it("invalidates own detail/list and every same-actor managed/sender cache but not another identity", async () => {
    api(); mount(); await open();
    const prefix = ["admin", "siteManagement", "contacts", "user", "account", "principal", null];
    client.setQueryData([...prefix, "all", 1], {});
    client.setQueryData([...prefix, "pending", 1], {});
    client.setQueryData([...prefix, "sender", "sender-id", 2], {});
    client.setQueryData(["admin", "siteManagement", "contact", "user", "account", "principal", null, id], {});
    client.setQueryData(["admin", "siteManagement", "contacts", "other-user"], {});
    await send();
    await waitFor(() => expect(client.getQueryState([...prefix, "all", 1])?.isInvalidated).toBe(true));
    expect(client.getQueryState([...prefix, "pending", 1])?.isInvalidated).toBe(true);
    expect(client.getQueryState([...prefix, "sender", "sender-id", 2])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["admin", "siteManagement", "contact", "user", "account", "principal", null, id])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["admin", "siteManagement", "contacts", "other-user"])?.isInvalidated).toBe(false);
  });
  it.each([500, "network"])("confirms a saved post after %s and clears the draft without automatic retry", async (failure) => {
    const fetchMock = api(async () => { if (failure === "network") throw new TypeError("disconnected"); return Response.json({ message: "internal server error" }, { status: 500 }); }, undefined, async () => Response.json({ ...contact, replies: [operator, post] }));
    mount(); await open(); await send();
    await screen.findByText(copy().replyNotificationUnconfirmed);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByText(post.content)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("keeps the ambiguous lock when a 500 has no matching post yet", async () => {
    api(async () => Response.json({}, { status: 500 })); mount(); await open(); await send();
    await screen.findByText(copy().replyUnknown);
    expect(screen.getByRole("textbox")).toHaveValue(post.content);
    expect(screen.queryByText(copy().replyNotificationUnconfirmed)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: text.reply })).not.toBeInTheDocument();
  });
  it("requires confirmation-only GET after an ambiguous failure and failed detail read, even after closing/reopening", async () => {
    let readsFail = true;
    const fetchMock = api(async () => Response.json({}, { status: 500 }), undefined, async () => readsFail ? Response.json({}, { status: 500 }) : Response.json({ ...contact, replies: [operator, post] }));
    mount(); await open(); await send();
    await screen.findByText(copy().replyUnknown);
    expect(screen.queryByRole("button", { name: text.reply })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy().close }));
    await open();
    await screen.findByRole("button", { name: copy().confirmReply });
    readsFail = false;
    fireEvent.click(screen.getByRole("button", { name: copy().confirmReply }));
    await screen.findByText(copy().replyNotificationUnconfirmed);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("invalidates freshly revisited related caches and refreshes the own list when recheck confirms a delayed save", async () => {
    let saved = false;
    const fetchMock = api(async () => Response.json({}, { status: 500 }), undefined, async () => Response.json({ ...contact, replies: saved ? [operator, post] : [operator] }));
    mount(); await open(); await send(); await screen.findByText(copy().replyUnknown);
    await waitFor(() => expect(screen.getByRole("button", { name: copy().close })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: copy().close }));
    const ownScope = ["myContacts", "user", "account", "principal"];
    const managementScope = ["admin", "siteManagement", "contacts", "user", "account", "principal", null];
    const managedDetail = ["admin", "siteManagement", "contact", "user", "account", "principal", null, id];
    const relatedKeys = [[...managementScope, "all", 1], [...managementScope, "pending", 1], [...managementScope, "sender", "sender-id", 2], managedDetail];
    // Simulate fresh cache data fetched on another route after the initial invalidation.
    act(() => {
      client.setQueryData(ownScope, [contact]);
      client.setQueryData([...ownScope, id], { ...contact, replies: [operator] });
      for (const key of relatedKeys) client.setQueryData(key, { freshBeforeDelayedSave: true });
      client.setQueryData(["admin", "siteManagement", "contacts", "other-user"], {});
    });
    await open();
    expect(relatedKeys.every((key) => client.getQueryState(key)?.isInvalidated === false)).toBe(true);
    const listReads = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/me")).length;
    saved = true;
    fireEvent.click(screen.getByRole("button", { name: copy().confirmReply }));
    await screen.findByText(copy().replyNotificationUnconfirmed);
    await waitFor(() => expect(relatedKeys.every((key) => client.getQueryState(key)?.isInvalidated === true)).toBe(true));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/me"))).toHaveLength(listReads + 1));
    expect(client.getQueryState([...ownScope, id])?.isInvalidated).toBe(true);
    expect(client.getQueryData([...ownScope, id])).toMatchObject({ replies: [operator, post] });
    expect(client.getQueryState(["admin", "siteManagement", "contacts", "other-user"])?.isInvalidated).toBe(false);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it.each([401, 403, 404, 409, 419, 422])("preserves errors and never auto retries %s", async (status) => {
    const fetchMock = api(async () => Response.json({ message: `rejected ${status}` }, { status })); mount(); await open(); await send();
    await screen.findByText(`rejected ${status}`);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    if (status === 422) expect(screen.getByRole("textbox")).toHaveValue(post.content);
    if ([401, 403, 419].includes(status)) expect(screen.queryByText(operator.content)).not.toBeInTheDocument();
  });
  it("discards drafts on selection and identity changes", async () => {
    api(); const view = mount(); await open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "draft" } });
    fireEvent.click(screen.getByRole("button", { name: copy().close }));
    fireEvent.click(screen.getByRole("button", { name: /別の問い合わせ/ }));
    expect(await screen.findByRole("textbox")).toHaveValue("");
    mocks.actor = "other"; view.refresh();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("does not insert a late reply into a new identity after unmount", async () => {
    let resolve!: (r: Response) => void;
    const fetchMock = api(() => new Promise((done) => { resolve = done; }));
    const view = mount(); await open(); await send();
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    mocks.actor = "new-identity"; view.refresh();
    await act(async () => resolve(new Response(null, { status: 204 })));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === detailUrl)).toHaveLength(2);
  });
  it("retains an uncertain attempt across identity unmount/remount without leaking its content", async () => {
    const fetchMock = api(async () => Response.json({}, { status: 500 }), undefined, async () => Response.json({}, { status: 500 }));
    const view = mount(); await open(); await send(); await screen.findByText(copy().replyUnknown);
    mocks.actor = "other"; view.refresh();
    fireEvent.click(await screen.findByRole("button", { name: /利用者/ }));
    expect(screen.queryByDisplayValue(post.content)).not.toBeInTheDocument();
    mocks.actor = "user"; view.refresh();
    fireEvent.click(await screen.findByRole("button", { name: /利用者/ }));
    await screen.findByRole("button", { name: copy().confirmReply });
    expect(screen.queryByRole("button", { name: text.reply })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("takes a fresh baseline before POST so a previously unseen same-content post cannot confirm this attempt", async () => {
    let detailReads = 0;
    const fetchMock = api(async () => Response.json({}, { status: 500 }), () => ++detailReads === 1 ? [operator] : [operator, post]);
    mount(); await open(); await send(); await screen.findByText(copy().replyUnknown);
    const postIndex = fetchMock.mock.calls.findIndex(([, init]) => init?.method === "POST");
    expect(fetchMock.mock.calls.slice(0, postIndex).filter(([url]) => url === detailUrl)).toHaveLength(2);
    expect(screen.queryByText(copy().replyNotificationUnconfirmed)).not.toBeInTheDocument();
  });
  it("normalizes surrounding whitespace before POST and confirms the trimmed saved content", async () => {
    const fetchMock = api(async () => Response.json({}, { status: 500 }), undefined, async () => Response.json({ ...contact, replies: [operator, post] }));
    mount(); await open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: ` \n${post.content}\n ` } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await screen.findByText(copy().replyNotificationUnconfirmed);
    expect(fetchMock.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body).toBe(JSON.stringify({ content: post.content }));
  });
  it.each([401, 403, 419])("hides stale history if confirmation loses access with %s", async (status) => {
    let confirmStatus = 500;
    api(async () => Response.json({}, { status: 500 }), undefined, async () => Response.json({ message: "confirmation denied" }, { status: confirmStatus }));
    mount(); await open(); await send(); await screen.findByText(copy().replyUnknown);
    confirmStatus = status;
    fireEvent.click(screen.getByRole("button", { name: copy().confirmReply }));
    await screen.findByText("confirmation denied");
    expect(screen.queryByText(operator.content)).not.toBeInTheDocument();
  });
  it("remains confirmation-only when a pending POST is unmounted and selected again", async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = api(() => new Promise((done) => { resolve = done; }));
    const view = mount(); await open(); await send();
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    mocks.actor = "other"; view.refresh();
    mocks.actor = "user"; view.refresh();
    await open();
    expect(screen.queryByRole("button", { name: text.reply })).not.toBeInTheDocument();
    await act(async () => resolve(Response.json({}, { status: 500 })));
    fireEvent.click(screen.getByRole("button", { name: copy().confirmReply }));
    await screen.findByText(copy().replyUnknown);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("keeps an acknowledged reply clear and confirmation-only when the success detail refresh fails", async () => {
    let failing = true;
    const fetchMock = api(undefined, undefined, async () => failing ? Response.json({}, { status: 500 }) : Response.json({ ...contact, replies: [operator, { ...post, sentAt: post.createdAt }] }));
    mount(); await open(); await send(); await screen.findByText(copy().replyRefreshFailed);
    expect(screen.getByRole("textbox")).toHaveValue("");
    failing = false;
    fireEvent.click(screen.getByRole("button", { name: copy().confirmReply }));
    await screen.findByText(copy().replySaved);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("never sends whitespace-only drafts", async () => {
    const fetchMock = api(); mount(); await open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: " \n\t " } });
    expect(screen.getByRole("button", { name: text.reply })).toBeDisabled();
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });
});
