import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { MyContactsClient } from "./MyContactsClient";

const mocks = vi.hoisted(() => ({ identity: {} as Record<string, unknown>, locale: "ja" as "ja" | "en" | "ko" }));
vi.mock("../../AdminProvider", () => ({ useAdmin: () => ({ currentIdentity: mocks.identity, locale: mocks.locale, t: dictionaries[mocks.locale].admin }) }));
vi.mock("../../../../i18n/I18nProvider", () => ({ useI18n: () => ({ dictionary: dictionaries[mocks.locale], locale: mocks.locale }) }));
const identity = { accountPrincipalStatus: "active", siteManagementPrincipalStatus: "active", identityIdentifier: "identity", accountIdentifier: "account", account: { status: "active" }, siteManagementPrincipalIdentifier: "principal", siteManagementPolicies: [{ name: "Not a role", policyIdentifier: "policy", statements: [{ effect: "allow", actions: ["contact:view"], resourceTypes: ["contact"], condition: "own_contact" }] }] };
const contact = { contactIdentifier: "11111111-1111-4111-8111-111111111111", identityIdentifier: null, category: 1, name: "山田花子", content: "送信したお問い合わせ", createdAt: "2026-08-27T12:00:00+00:00", replyIdentifiers: [] };
const reply = { replyIdentifier: "33333333-3333-4333-8333-333333333333", content: "ご連絡ありがとうございます。", sentAt: contact.createdAt };
const detail = { ...contact, content: "問い合わせの詳細本文", replies: [reply] };
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  const element = () => <QueryClientProvider client={client}><MyContactsClient /></QueryClientProvider>;
  const view = render(element());
  return { ...view, refresh: () => view.rerender(element()) };
}
beforeEach(() => { mocks.identity = identity; mocks.locale = "ja"; vi.stubGlobal("scrollTo", vi.fn()); });
afterEach(() => { cleanup(); client?.clear(); vi.unstubAllGlobals(); });
describe("MyContactsClient", () => {
  it("keeps reply types through the public mapper and displays failed-notification posts without authors", async () => {
    const createdAt = "2026-10-09T10:00:00+09:00";
    const replies = [
      { ...reply, replyType: "operator", createdAt, name: "秘密の運営名" },
      { ...reply, replyIdentifier: contact.contactIdentifier, replyType: "submitter", createdAt, sentAt: null, content: "追加の状況です。", name: "秘密の本人名" },
    ];
    vi.stubGlobal("fetch", vi.fn(async (url) => Response.json(String(url).endsWith("/me") ? [contact] : { ...detail, replies })));
    mount();
    fireEvent.click(await screen.findByRole("button"));
    await screen.findByText(replies[1].content);
    const articles = screen.getAllByRole("article");
    expect(articles[0].parentElement).toHaveClass("border-brand-primary");
    expect(articles[1].parentElement).toHaveClass("border-brand-secondary");
    const format = (value: string) => new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
    expect(articles[0]).toHaveTextContent(format(reply.sentAt));
    expect(articles[1]).toHaveTextContent(format(createdAt));
    expect(screen.queryByText(/秘密の/)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  it.each([
    ["短い本文", "短い本文"],
    ["あ".repeat(50), "あ".repeat(50)],
    ["あ".repeat(51), `${"あ".repeat(50)}…`],
    [`${"あ".repeat(49)}👨‍👩‍👧‍👦🇯🇵`, `${"あ".repeat(49)}👨‍👩‍👧‍👦…`],
    [`${"e\u0301".repeat(50)}!`, `${"e\u0301".repeat(50)}…`],
    ["改行を含む\n問い合わせ本文", "改行を含む\n問い合わせ本文"],
  ])("uses the shared 50-grapheme preview: %s", async (content, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([{ ...contact, content }])));
    mount();
    const card = await screen.findByRole("button");
    expect(card.lastElementChild?.textContent).toBe(expected);
    expect(card.lastElementChild).toHaveClass("min-w-0", "whitespace-pre-wrap", "[overflow-wrap:anywhere]");
    expect(card).not.toHaveAttribute("aria-expanded");
    expect(card).toHaveAttribute("aria-haspopup", "dialog");
    expect(card).toHaveClass("border", "focus-visible:ring-2");
  });
  it.each(["ja", "en", "ko"] as const)("uses shared metadata, reply statuses and locale dates in %s with readonly dialog detail", async (locale) => {
    mocks.locale = locale;
    const t = dictionaries[locale].admin.myContacts;
    const contacts = [0, 1, 3, 10, 100].map((count, index) => ({ ...contact, name: `山田花子 ${count}`, contactIdentifier: contact.contactIdentifier.replace("111111111111", String(index + 1).repeat(12)), replyIdentifiers: Array.from({ length: count }, () => reply.replyIdentifier) }));
    const fetchMock = vi.fn(async (url) => Response.json(String(url).endsWith("/me") ? contacts : detail));
    vi.stubGlobal("fetch", fetchMock);
    mount();
    await screen.findByText(contacts[0].name);
    const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(contact.createdAt));
    const cards = contacts.map((item) => {
      const card = screen.getByText(item.name).closest("button")!;
      const topRow = card.firstElementChild!;
      const metadata = topRow.firstElementChild!;
      expect(topRow).toHaveClass("grid", "grid-cols-[minmax(0,1fr)_auto]", "items-start", "gap-3");
      expect(Array.from(metadata.children).map((child) => child.textContent)).toEqual([t.category(item.category), item.name, date]);
      expect(within(card).getByText(date)).toHaveClass("ml-auto", "text-right");
      expect(within(card).queryByText(t.awaitingReply)).not.toBeInTheDocument();
      const count = item.replyIdentifiers.length;
      if (count > 0) {
        const badge = within(card).getByLabelText(t.replyCount(count));
        expect(badge.textContent).toBe(String(count));
        expect(badge).toHaveClass("aspect-square", "min-w-6", "rounded-full", "text-status-success", "bg-surface-raised");
        expect(badge.className).not.toMatch(/absolute|-top-|truncate/);
        expect(badge).toBe(topRow.lastElementChild);
        expect(metadata).not.toContainElement(badge);
      } else {
        expect(topRow.children).toHaveLength(1);
      }
      expect(card.parentElement).toHaveClass("gap-4");
      for (let parent = card.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        expect(parent.className).not.toMatch(/overflow-(?:hidden|clip)/);
      }
      expect(card).not.toHaveAttribute("aria-expanded");
      expect(card).toHaveAttribute("aria-haspopup", "dialog");
      return card;
    });
    expect(screen.getAllByRole("button")).toHaveLength(contacts.length);
    expect(screen.getByRole("option", { name: t.awaitingReply })).toHaveValue("awaitingReply");
    expect(screen.getByRole("option", { name: t.replied })).toHaveValue("replied");
    cards[0].focus();
    expect(cards[0]).toHaveFocus();
    fireEvent.click(cards[0], { detail: 0 });
    await screen.findByText(reply.content);
    const dialog = screen.getByRole("dialog", { name: t.title });
    const common = dictionaries[locale].admin.siteManagementContacts;
    const heading = within(dialog).getByRole("heading", { level: 3, name: t.title });
    expect(heading.nextElementSibling).toHaveTextContent(common.savedName(detail.name));
    expect(within(dialog).getByText(detail.content).previousElementSibling).toHaveTextContent(`${t.category(detail.category)} · ${date}`);
    expect(within(dialog).getByRole("article")).toHaveTextContent(date);
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole("button", { name: t.close }));
    expect(cards[0]).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(reply.content)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/me"))).toHaveLength(1);
    expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith("/api/site-management/contact/me"))).toBe(true);
  });
  it("filters reply status and opens readonly detail without exposing an author", async () => {
    const answered = { ...contact, contactIdentifier: "44444444-4444-4444-8444-444444444444", content: "返信済み本文", replyIdentifiers: [reply.replyIdentifier] };
    vi.stubGlobal("fetch", vi.fn(async (url) => Response.json(String(url).endsWith("/me") ? [contact, answered] : { ...detail, replies: [{ ...reply, name: "秘密の返信者", principalIdentifier: "private" }] })));
    mount();
    await screen.findByText(contact.content);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "replied" } });
    expect(screen.queryByText(contact.content)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByText(reply.content)).toBeInTheDocument();
    expect(screen.queryByText("秘密の返信者")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: dictionaries.ja.admin.myContacts.close }));
    expect(screen.queryByText(reply.content)).not.toBeInTheDocument();
  });
  it.each([401, 403, 500])("hides stale list and detail after a refetch returns %s", async (status) => {
    let denied = false;
    vi.stubGlobal("fetch", vi.fn(async (url) => denied ? Response.json({ message: "rejected" }, { status }) : Response.json(String(url).endsWith("/me") ? [contact] : detail)));
    mount();
    fireEvent.click(await screen.findByRole("button"));
    await screen.findByText(reply.content);
    denied = true;
    await client.invalidateQueries({ queryKey: ["myContacts"] });
    await waitFor(() => expect(screen.queryByText(contact.content)).not.toBeInTheDocument());
    expect(screen.queryByText(reply.content)).not.toBeInTheDocument();
    expect(screen.getByText("rejected")).toBeInTheDocument();
  });
  it.each([401, 403, 404, 500])("hides stale detail and saved name after detail fails with %s", async (status) => {
    let denied = false;
    vi.stubGlobal("fetch", vi.fn(async (url) => String(url).endsWith("/me") ? Response.json([contact]) : denied ? Response.json({ message: "detail rejected" }, { status }) : Response.json(detail)));
    mount();
    fireEvent.click(await screen.findByRole("button"));
    await screen.findByText(reply.content);
    denied = true;
    await client.invalidateQueries({ predicate: (q) => q.queryKey.length > 4 });
    await screen.findByText("detail rejected");
    expect(screen.queryByText(reply.content)).not.toBeInTheDocument();
    expect(screen.queryByText(detail.content)).not.toBeInTheDocument();
    expect(screen.queryByText(dictionaries.ja.admin.siteManagementContacts.savedName(detail.name))).not.toBeInTheDocument();
  });
  it.each(["identityIdentifier", "accountIdentifier", "siteManagementPrincipalIdentifier"])("resets selection and separates cache when %s changes", async (field) => {
    let switched = false;
    const fetchMock = vi.fn(async (url) => Response.json(String(url).endsWith("/me") ? [{ ...contact, content: switched ? "切替後の本文" : contact.content }] : detail));
    vi.stubGlobal("fetch", fetchMock);
    const view = mount();
    fireEvent.click(await screen.findByRole("button"));
    await screen.findByText(reply.content);
    switched = true;
    mocks.identity = { ...identity, [field]: "new-value" };
    view.refresh();
    expect(screen.queryByText(reply.content)).not.toBeInTheDocument();
    expect(screen.queryByText(contact.content)).not.toBeInTheDocument();
    await screen.findByText("切替後の本文");
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-expanded");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => !String(url).endsWith("/me"))).toHaveLength(1);
  });
  it.each([null, { ...identity, account: { status: "suspended" } }, { ...identity, siteManagementPolicies: [] }])("does not fetch for an unauthorized identity: %j", (actor) => {
    mocks.identity = actor as unknown as Record<string, unknown>;
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    mount();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["removed", "error"])("clears selection permanently when the own list is %s, even after recovery", async (reason) => {
    let state = "ready";
    vi.stubGlobal("fetch", vi.fn(async (url) => String(url).endsWith("/me")
      ? state === "error" ? Response.json({ message: "denied" }, { status: 403 }) : Response.json(state === "removed" ? [] : [contact])
      : Response.json(detail)));
    mount();
    fireEvent.click(await screen.findByRole("button"));
    await screen.findByText(reply.content);
    state = reason;
    await client.invalidateQueries({ queryKey: ["myContacts"] });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    state = "ready";
    await client.invalidateQueries({ queryKey: ["myContacts"] });
    await screen.findByText(contact.content);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it.each([0, 1])("resets history on close/reopen, preserves the filter and uses native keyboard activation (click detail=%s)", async (clickDetail) => {
    const answered = { ...contact, replyIdentifiers: [reply.replyIdentifier] };
    const replies = [reply, { ...reply, replyIdentifier: "44444444-4444-4444-8444-444444444444", content: "対応が完了しました。" }];
    const fetchMock = vi.fn(async (url) => Response.json(String(url).endsWith("/me") ? [answered] : { ...detail, replies }));
    vi.stubGlobal("fetch", fetchMock);
    mount();
    const opener = await screen.findByRole("button");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "replied" } });
    for (const exit of ["close", "escape"]) {
      opener.focus();
      expect(opener.tagName).toBe("BUTTON");
      expect(opener.tabIndex).toBe(0);
      // Enter/Space default actions synthesize click(detail=0); jsdom doesn't implement them.
      fireEvent.click(opener, { detail: clickDetail });
      const dialog = screen.getByRole("dialog");
      const heading = within(dialog).getByRole("heading", { level: 3 });
      expect(heading).toHaveFocus();
      await within(dialog).findByText(reply.content);
      const history = within(dialog).getByRole("heading", { level: 4 }).closest("details")!;
      expect(history).toHaveAttribute("open");
      const articles = within(history).getAllByRole("article");
      expect(articles).toHaveLength(2);
      articles.forEach((article) => {
        expect(article.parentElement).toHaveClass("border-l-2", "border-brand-primary", "pl-3");
        expect(article.parentElement?.parentElement).toHaveClass("ml-2", "gap-3");
        expect(article.querySelectorAll("p")).toHaveLength(2); // content and sentAt only
      });
      expect(within(dialog).queryByText(dictionaries.ja.admin.siteManagementContacts.unknownReplyAuthor)).not.toBeInTheDocument();
      fireEvent.click(history.querySelector("summary")!, { detail: clickDetail });
      expect(history).not.toHaveAttribute("open");
      if (exit === "close") fireEvent.click(within(dialog).getByRole("button", { name: dictionaries.ja.admin.myContacts.close }));
      else fireEvent(dialog, new Event("cancel", { cancelable: true }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
      expect(screen.getByRole("combobox")).toHaveValue("replied");
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(opener);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "awaitingReply" } });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "replied" } });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it.each(["close", "escape", "permission", "identity", "unmount"])("restores scroll styles, priorities and coordinates on %s", async (exit) => {
    const rootStyle = document.documentElement.style.cssText;
    const bodyStyle = document.body.style.cssText;
    document.documentElement.style.cssText = "overflow-x: auto !important; overflow-y: scroll; color: red;";
    document.body.style.cssText = "position: relative !important; top: 3px; left: 4px; width: 90%; overflow-y: auto !important;";
    const expectedRoot = document.documentElement.style.cssText;
    const expectedBody = document.body.style.cssText;
    vi.stubGlobal("scrollX", 24);
    vi.stubGlobal("scrollY", 720);
    vi.stubGlobal("fetch", vi.fn(async (url) => Response.json(String(url).endsWith("/me") ? [contact] : detail)));
    const view = mount();
    try {
      const opener = await screen.findByRole("button");
      opener.focus();
      fireEvent.click(opener);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("w-[calc(100%_-_2rem)]", "max-h-[90dvh]", "overflow-y-auto", "overscroll-contain");
      expect(document.documentElement.style.overflowY).toBe("hidden");
      expect(document.body.style.position).toBe("fixed");
      expect(document.body.style.top).toBe("-720px");
      expect(document.body.style.left).toBe("-24px");
      if (exit === "close") fireEvent.click(within(dialog).getByRole("button", { name: dictionaries.ja.admin.myContacts.close }));
      else if (exit === "escape") fireEvent(dialog, new Event("cancel", { cancelable: true }));
      else if (exit === "unmount") view.unmount();
      else {
        mocks.identity = exit === "permission" ? { ...identity, siteManagementPolicies: [] } : { ...identity, identityIdentifier: "other" };
        view.refresh();
      }
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.documentElement.style.cssText).toBe(expectedRoot);
      expect(document.body.style.cssText).toBe(expectedBody);
      expect(window.scrollTo).toHaveBeenLastCalledWith({ left: 24, top: 720, behavior: "instant" });
    } finally {
      cleanup();
      document.documentElement.style.cssText = rootStyle;
      document.body.style.cssText = bodyStyle;
    }
  });
  it("shows loading then missing-field error without leaking a stale saved name or reply", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((url) => String(url).endsWith("/me")
      ? Promise.resolve(Response.json([contact])) : new Promise<Response>((done) => { resolve = done; })));
    mount();
    fireEvent.click(await screen.findByRole("button"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(dictionaries.ja.admin.myContacts.detailLoading)).toBeInTheDocument();
    expect(within(dialog).queryByText(dictionaries.ja.admin.siteManagementContacts.savedName(contact.name))).not.toBeInTheDocument();
    resolve(Response.json({ ...detail, name: undefined }));
    await within(dialog).findByRole("alert");
    expect(within(dialog).queryByText(detail.content)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(reply.content)).not.toBeInTheDocument();
  });
});
