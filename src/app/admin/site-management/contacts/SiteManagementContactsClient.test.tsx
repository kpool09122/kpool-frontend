import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "@/i18n/dictionaries";
import { SiteManagementContactsClient } from "./SiteManagementContactsClient";

const mocks = vi.hoisted(() => ({ locale: "ja" as "ja" | "en" | "ko", actions: ["contact:view", "contact:reply"], pathname: "/admin/site-management/contacts/manage", search: "hasReply=0", push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useSearchParams: () => new URLSearchParams(mocks.search), useRouter: () => ({ push: mocks.push, replace: mocks.replace }) }));
vi.mock("../../AdminProvider", () => ({
  useAdmin: () => ({
    locale: mocks.locale,
    t: dictionaries[mocks.locale].admin,
    currentIdentity: {
      accountPrincipalStatus: "active",
      siteManagementPrincipalStatus: "active",
      identityIdentifier: "operator",
      name: "閲覧中の管理者",
      accountIdentifier: "account",
      account: { status: "active" },
      siteManagementPrincipalIdentifier: "operator-principal",
      siteManagementPolicies: [{
        name: "Operator",
        policyIdentifier: "policy",
        statements: [{ effect: "allow", actions: mocks.actions, resourceTypes: ["contact"], condition: null }],
      }],
    },
  }),
}));

const identifier = "019a1234-5678-7000-8000-111111111111";
const contact = {
  contactIdentifier: identifier,
  principalIdentifier: null as string | null,
  category: 1,
  name: "Anonymous sender",
  replyIdentifiers: [] as string[],
  createdAt: "2026-10-08T00:00:00+00:00",
  content: "ログイン後に画面が表示されません。確認をお願いします。",
};
const detail = { ...contact, content: "Anonymous inquiry", replies: [] };
const text = dictionaries.ja.admin.siteManagementContacts;
const listUrl = "/api/site-management/contacts?hasReply=0&page=1&perPage=50";
const detailUrl = `/api/site-management/contacts/${identifier}`;
const replyUrl = `${detailUrl}/replies`;
const page = (contacts = [contact]) => ({ contacts, current_page: 1, last_page: 1, total: contacts.length, per_page: 50 });
const cardName = (name = contact.name, category = contact.category, locale = mocks.locale, replyCount = 0) =>
  `${dictionaries[locale].admin.siteManagementContacts.category(category)} ${name} ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(contact.createdAt))}${replyCount > 0 ? ` ${dictionaries[locale].admin.myContacts.replyCount(replyCount)}` : ""} ${contact.content}`;

function renderContacts(staleTime = 0, strict = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime }, mutations: { retry: false } } });
  const content = () => <QueryClientProvider client={client}><SiteManagementContactsClient /></QueryClientProvider>;
  const view = render(strict ? <StrictMode>{content()}</StrictMode> : content());
  const switchTab = (pathname: string) => {
    const url = new URL(pathname, window.location.origin);
    mocks.pathname = url.pathname;
    mocks.search = url.search;
    view.rerender(strict ? <StrictMode>{content()}</StrictMode> : content());
  };
  return { ...view, client, switchTab };
}

beforeEach(() => {
  mocks.locale = "ja";
  mocks.actions = ["contact:view", "contact:reply"];
  mocks.pathname = "/admin/site-management/contacts/manage";
  mocks.search = "hasReply=0";
  mocks.push.mockReset();
  mocks.replace.mockReset();
  vi.stubGlobal("scrollTo", vi.fn());
  document.cookie = "XSRF-TOKEN=test-csrf; Path=/";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.cookie = "XSRF-TOKEN=; Max-Age=0; Path=/";
});

describe("site-management contacts anonymous inquiry path", () => {
  it("keeps persisted reply types through the author mapper regardless of the viewer or author", async () => {
    const createdAt = "2026-10-09T10:00:00+09:00";
    const sentAt = "2026-10-09T11:00:00+09:00";
    const replies = [
      { replyIdentifier: identifier, content: "運営からの返信", replyType: "operator", createdAt, sentAt, name: null },
      { replyIdentifier: "019a1234-5678-7000-8000-222222222222", content: "お問い合わせ者の追加情報", replyType: "submitter", createdAt, sentAt: null, name: "閲覧中の管理者" },
    ];
    vi.stubGlobal("fetch", vi.fn(async (input) => Response.json(input === detailUrl ? { ...detail, replies } : page())));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    await screen.findByText(replies[1].content);
    const articles = screen.getAllByRole("article");
    expect(articles[0].parentElement).toHaveClass("border-brand-primary");
    expect(articles[1].parentElement).toHaveClass("border-brand-secondary");
    expect(articles[0]).toHaveTextContent(text.unknownReplyAuthor);
    expect(articles[1]).toHaveTextContent(text.replyAuthor("閲覧中の管理者"));
    const format = (value: string) => new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
    expect(articles[0]).toHaveTextContent(format(sentAt));
    expect(articles[1]).toHaveTextContent(format(createdAt));
    client.clear();
  });
  describe.each(["ja", "en", "ko"] as const)("shared reply status in %s", (locale) => {
    it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("shows exact reply counts inside main and sender cards on %s", async (pathname) => {
      mocks.locale = locale;
      mocks.pathname = pathname.split("?")[0];
      mocks.search = pathname.split("?")[1] ?? "";
      const labels = dictionaries[locale].admin.myContacts;
      const contacts = [0, 1, 3, 10, 100].map((count, index) => ({ ...contact, name: `送信者 ${count}`, contactIdentifier: identifier.replace("111111111111", String(index + 1).repeat(12)), replyIdentifiers: Array.from({ length: count }, () => identifier) }));
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl
        ? { ...detail, principalIdentifier: identifier }
        : page(contacts)));
      vi.stubGlobal("fetch", fetchMock);
      const { client } = renderContacts(Infinity);
      const assertStatuses = (scope: HTMLElement) => contacts.map((item) => {
        const card = within(scope).getByText(item.name).closest("button")!;
        expect(within(card).queryByText(labels.awaitingReply)).not.toBeInTheDocument();
        const topRow = card.firstElementChild!;
        expect(topRow).toHaveClass("grid", "grid-cols-[minmax(0,1fr)_auto]", "items-start", "gap-3");
        const count = item.replyIdentifiers.length;
        if (count > 0) {
          const badge = within(card).getByLabelText(labels.replyCount(count));
          expect(badge.textContent).toBe(String(count));
          expect(badge).toHaveClass("aspect-square", "min-w-6", "rounded-full", "border", "text-status-success", "bg-surface-raised");
          expect(badge.className).not.toMatch(/absolute|-top-|truncate/);
          expect(badge).toBe(topRow.lastElementChild);
          expect(topRow.firstElementChild).not.toContainElement(badge);
        } else {
          expect(topRow.children).toHaveLength(1);
        }
        // No outside badge clearance is needed in either list or dialog.
        if (scope.tagName === "DIALOG") {
          expect(card.parentElement).toHaveClass("gap-5", "p-6");
        } else {
          expect(card.parentElement).toHaveClass("gap-3");
          expect(card.parentElement?.parentElement).toHaveClass("gap-5");
        }
        for (let parent = card.parentElement; parent && parent !== scope; parent = parent.parentElement) {
          expect(parent.className).not.toMatch(/overflow-(?:hidden|clip)/);
        }
        expect(card.lastElementChild).toHaveTextContent(item.content);
        return card;
      });
      await screen.findByText(contacts[0].name);
      fireEvent.click(assertStatuses(document.body)[0]);
      const dialog = screen.getByRole("dialog");
      fireEvent.click(await within(dialog).findByRole("button", { name: dictionaries[locale].admin.siteManagementContacts.viewSenderContacts }));
      await within(dialog).findByText(contacts[0].name);
      assertStatuses(dialog);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      client.clear();
    });
  });

  it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("keeps the reply textarea taller with min-h-48 on %s", async (pathname) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? detail : page())));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    const textarea = await within(screen.getByRole("dialog")).findByRole("textbox", { name: text.replyContent });
    expect(textarea).toHaveClass("min-h-48");
    expect(textarea).not.toHaveClass("min-h-28");
    client.clear();
  });

  it.each([0, 1])("toggles the default-expanded native reply history without hiding the form (click detail=%s)", async (clickDetail) => {
    const sentReply = { replyIdentifier: identifier, name: "山田はるか", content: "表示の問題を調査しています。", sentAt: "2026-10-09T00:00:00+00:00" };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? { ...detail, replies: [sentReply] } : page())));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    const heading = await screen.findByRole("heading", { name: text.previousReplies });
    const history = heading.closest("details");
    expect(history).not.toBeNull();
    const summary = history!.querySelector("summary")!;
    expect(summary).toContainElement(heading);
    expect(summary).toHaveClass("list-item", "cursor-pointer", "focus-visible:ring-2", "focus-visible:ring-brand-primary");
    expect(history).toHaveAttribute("open");
    summary.focus();
    expect(summary).toHaveFocus();
    // Native Enter/Space synthesize a click with detail=0; jsdom does not implement that key default action.
    fireEvent.click(summary, { detail: clickDetail });
    expect(history).not.toHaveAttribute("open");
    expect(screen.getByText(sentReply.content)).not.toBeVisible();
    const form = screen.getByRole("textbox", { name: text.replyContent });
    expect(history).not.toContainElement(form);
    expect(form).toBeVisible();
    fireEvent.change(form, { target: { value: "確認ありがとうございます。" } });
    expect(history).not.toHaveAttribute("open");
    fireEvent.click(summary, { detail: clickDetail });
    expect(history).toHaveAttribute("open");
    expect(screen.getByText(sentReply.content)).toBeVisible();
    client.clear();
  });

  it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("resets collapsed history when selecting another cached contact or reopening on %s", async (pathname) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-444444444444", name: "佐藤 直樹" };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(String(input).includes("?")
      ? page([contact, other])
      : { ...detail, contactIdentifier: String(input).split("/").at(-1) })));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName(other.name) }));
    await screen.findByText(text.noPreviousReplies);
    fireEvent.click(screen.getByRole("button", { name: text.close }));
    fireEvent.click(screen.getByRole("button", { name: cardName() }));
    const heading = await screen.findByRole("heading", { name: text.previousReplies });
    const firstHistory = heading.closest("details")!;
    expect(firstHistory).toHaveAttribute("open");
    fireEvent.click(firstHistory.querySelector("summary")!);
    expect(screen.getByText(text.noPreviousReplies)).not.toBeVisible();
    // Exercise a selection change with both details cached, without a loading/unmount interval.
    fireEvent.click(screen.getByRole("button", { name: cardName(other.name) }));
    const otherHistory = screen.getByRole("heading", { name: text.previousReplies }).closest("details")!;
    expect(otherHistory).not.toBe(firstHistory);
    expect(otherHistory).toHaveAttribute("open");
    fireEvent.click(otherHistory.querySelector("summary")!);
    fireEvent.click(screen.getByRole("button", { name: text.close }));
    fireEvent.click(screen.getByRole("button", { name: cardName(other.name) }));
    expect(screen.getByRole("heading", { name: text.previousReplies }).closest("details")).toHaveAttribute("open");
    expect(screen.getByText(text.noPreviousReplies)).toBeVisible();
    client.clear();
  });

  it.each([
    ["/admin/site-management/contacts/manage", 1],
    ["/admin/site-management/contacts/manage", 2],
    ["/admin/site-management/contacts/manage?hasReply=0", 1],
    ["/admin/site-management/contacts/manage?hasReply=0", 2],
  ] as const)("gives legacy operator replies separate primary-color indented rails with gaps on %s (replies=%s)", async (pathname, replyCount) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    const replies = [
      { replyIdentifier: "019a1234-5678-7000-8000-222222222222", name: "山田はるか", content: "ログイン後の表示について調査しています。", sentAt: "2026-10-09T00:00:00+00:00" },
      { replyIdentifier: "019a1234-5678-7000-8000-333333333333", name: "김민준", content: "修正が完了しました。再度ご確認ください。", sentAt: "2026-10-10T00:00:00+00:00" },
    ].slice(0, replyCount);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? { ...detail, replies } : page())));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    const dialog = screen.getByRole("dialog");
    const body = await within(dialog).findByText(detail.content);
    expect(body.closest("section")).toHaveClass("grid", "gap-3", "rounded-lg", "bg-surface-base", "p-4");
    expect(body.closest("section")?.className).not.toMatch(/\bborder(?:-|\b)/);
    const articles = within(dialog).getAllByRole("article");
    expect(articles).toHaveLength(replies.length);
    const heading = within(dialog).getByRole("heading", { name: text.previousReplies });
    const segments = articles.map((article) => article.parentElement!);
    const thread = segments[0].parentElement!;
    expect(heading.closest("summary")?.nextElementSibling).toBe(thread);
    expect(thread).toHaveClass("grid", "gap-3", "min-w-0", "ml-2");
    expect(thread.className).not.toMatch(/\bborder(?:-|\b)/);
    expect(Array.from(thread.children)).toEqual(segments);
    expect(new Set(segments).size).toBe(replies.length);
    expect(Array.from(dialog.querySelectorAll('[class~="border-l-2"], [class~="border-l-4"]'))).toEqual(segments);
    articles.forEach((article, index) => {
      expect(segments[index]).toHaveClass("min-w-0", "pl-3", "border-l-2", "border-brand-primary");
      expect(Array.from(segments[index].children)).toEqual([article]);
      expect(article).toHaveClass("min-w-0", "rounded-lg", "bg-surface-base", "p-3");
      expect(article.className).not.toMatch(/\bborder(?:-|\b)/);
      expect(article.firstElementChild).toHaveClass("whitespace-pre-wrap", "[overflow-wrap:anywhere]");
      expect(article.firstElementChild).toHaveTextContent(replies[index].content);
      expect(within(article).getByText(text.replyAuthor(replies[index].name))).toBeInTheDocument();
      expect(within(article).getByText(new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(replies[index].sentAt)))).toBeInTheDocument();
    });
    expect(body.closest("section")?.nextElementSibling).toContainElement(within(dialog).getByRole("heading", { name: text.previousReplies }));
    client.clear();
  });

  it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("shows an empty reply message without any thread line on %s", async (pathname) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? detail : page())));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    const dialog = screen.getByRole("dialog");
    const empty = await within(dialog).findByText(text.noPreviousReplies);
    expect(within(dialog).getByRole("heading", { name: text.previousReplies }).closest("summary")?.nextElementSibling).toBe(empty);
    expect(within(dialog).queryByRole("article")).not.toBeInTheDocument();
    expect(dialog.querySelector('[class~="border-l-2"], [class~="border-l-4"]')).toBeNull();
    client.clear();
  });

  it.each([
    ["ja", "返信者：", "返信者不明"],
    ["en", "Replied by: ", "Unknown responder"],
    ["ko", "답변자: ", "알 수 없는 답변자"],
  ] as const)("shows each API reply author and date without substituting the viewer/sender or exposing UUIDs in %s", async (locale, prefix, unknown) => {
    mocks.locale = locale;
    const replyId = (index: number) => identifier.replace("111111111111", (index + 2).toString(16).repeat(12));
    const authors = [
      { principalIdentifier: replyId(0), name: "山田はるか" },
      { principalIdentifier: replyId(1), name: "김민준" },
      { principalIdentifier: null, name: "Alex Morgan" },
      { principalIdentifier: replyId(2), name: null },
      { principalIdentifier: null, name: null },
      {},
      { principalIdentifier: replyId(3) },
      { name: "<b>担当者</b>" },
      { name: "" },
      { name: "  " },
    ];
    const replies = authors.map((author, index) => ({ replyIdentifier: replyId(index), content: `確認結果 ${index + 1}`, sentAt: `2026-10-${String(index + 10).padStart(2, "0")}T00:00:00+00:00`, ...author }));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? { ...detail, replies } : page())));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    await screen.findByText(replies[0].content);
    const dialog = screen.getByRole("dialog");
    const articles = within(dialog).getAllByRole("article");
    expect(articles).toHaveLength(replies.length);
    articles.forEach((article, index) => {
      const name = authors[index].name;
      expect(within(article).getByText(name?.trim() ? `${prefix}${name}` : unknown)).toBeInTheDocument();
      expect(within(article).getByText(new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(replies[index].sentAt)))).toBeInTheDocument();
      expect(article).toHaveTextContent(replies[index].content);
      expect(article).not.toHaveTextContent(contact.name);
      expect(article).not.toHaveTextContent("閲覧中の管理者");
      expect(article.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      expect(article.querySelector("b")).toBeNull();
    });
    client.clear();
  });

  describe.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("content preview on %s", (pathname) => {
    it.each([
      ["empty", "", ""],
      ["49 characters", "あ".repeat(49), "あ".repeat(49)],
      ["50 characters", "あ".repeat(50), "あ".repeat(50)],
      ["51 characters", "あ".repeat(51), `${"あ".repeat(50)}…`],
      ["newlines", "最初の行\n次の行\r\n最後の行", "最初の行\n次の行\r\n最後の行"],
      ["50 emoji", "😀".repeat(50), "😀".repeat(50)],
      ["joined emoji at boundary", `${"あ".repeat(49)}👨‍👩‍👧‍👦🇯🇵`, `${"あ".repeat(49)}👨‍👩‍👧‍👦…`],
      ["combining marks", `${"e\u0301".repeat(50)}!`, `${"e\u0301".repeat(50)}…`],
      ["HTML as text", "<b>確認</b><img src=x onerror=alert(1)>", "<b>確認</b><img src=x onerror=alert(1)>"],
      ["unbroken text", "a".repeat(5000), `${"a".repeat(50)}…`],
    ])("shows %s from the list response on both main and sender cards without extra detail fetching", async (_label, content, expected) => {
      mocks.pathname = pathname.split("?")[0];
      mocks.search = pathname.split("?")[1] ?? "";
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl
        ? { ...detail, principalIdentifier: "019a1234-5678-7000-8000-333333333333" }
        : page([{ ...contact, content }])));
      vi.stubGlobal("fetch", fetchMock);
      const { client, container } = renderContacts(Infinity);
      const assertPreview = (card: HTMLElement) => {
        expect(card.tagName).toBe("BUTTON");
        expect(card).toHaveAttribute("type", "button");
        expect(card).toHaveClass("min-w-0", "w-full", "focus-visible:ring-2", "disabled:opacity-60");
        expect(card.children).toHaveLength(2);
        const [metadata, preview] = Array.from(card.children);
        expect(metadata).toHaveClass("grid", "grid-cols-[minmax(0,1fr)_auto]", "items-start", "min-w-0");
        expect(metadata.firstElementChild).toHaveClass("flex", "flex-wrap", "items-center", "min-w-0");
        expect(Array.from(metadata.firstElementChild!.children).map((child) => child.textContent)).toEqual([
          text.category(contact.category), contact.name,
          new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(contact.createdAt)),
        ]);
        expect(preview.textContent).toBe(expected);
        expect(preview).toHaveClass("min-w-0", "whitespace-pre-wrap", "[overflow-wrap:anywhere]");
        expect(card.querySelector("b, img, button, a")).toBeNull();
      };
      const opener = (await within(container).findByText(contact.name)).closest("button")!;
      assertPreview(opener);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      fireEvent.click(opener);
      const dialog = screen.getByRole("dialog");
      await within(dialog).findByText(detail.content);
      expect(fetchMock.mock.calls.filter(([input]) => input === detailUrl)).toHaveLength(1);
      fireEvent.click(within(dialog).getByRole("button", { name: text.viewSenderContacts }));
      const senderCard = (await within(dialog).findByText(contact.name, { exact: true })).closest("button")!;
      assertPreview(senderCard);
      expect(screen.getByRole("dialog")).toBe(dialog);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls.filter(([input]) => input === detailUrl)).toHaveLength(1);
      client.clear();
    });
  });

  it.each([
    ["/admin/site-management/contacts/manage", 1],
    ["/admin/site-management/contacts/manage?hasReply=0", 1],
    // Keyboard activation dispatches a click with detail=0. jsdom does not synthesize Enter/Space's native default action.
    ["/admin/site-management/contacts/manage", 0],
    ["/admin/site-management/contacts/manage?hasReply=0", 0],
  ] as const)("opens detail from the whole native card with badge, long name and date in order on %s (click detail=%s)", async (pathname, clickDetail) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    const name = "山田はるか".repeat(40) + "VeryLongUnbrokenSenderName".repeat(20);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl
      ? { ...detail, name, principalIdentifier: "019a1234-5678-7000-8000-333333333333" }
      : page([{ ...contact, name }]))));
    const { client } = renderContacts(Infinity);
    const date = new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(contact.createdAt));
    const cardName = `${text.category(contact.category)} ${name} ${date} ${contact.content}`;
    const assertCard = (card: HTMLElement) => {
      expect(card.tagName).toBe("BUTTON");
      expect(card).toHaveAttribute("type", "button");
      expect(card.tabIndex).toBe(0);
      card.focus();
      expect(card).toHaveFocus();
      expect(card).toHaveClass("grid", "w-full", "min-w-0", "text-left", "hover:border-brand-primary", "focus-visible:ring-2");
      expect(card.firstElementChild?.firstElementChild).toHaveClass("flex", "flex-wrap", "items-center");
      expect(Array.from(card.firstElementChild!.firstElementChild!.children).map((child) => child.textContent)).toEqual([text.category(contact.category), name, date]);
      expect(card.lastElementChild).toHaveTextContent(contact.content);
      expect(within(card).getByText(name)).toHaveClass("min-w-0", "break-all");
      expect(within(card).getByText(date)).toHaveClass("ml-auto", "text-right", "min-w-0", "break-words");
      expect(card.querySelector("button, a")).toBeNull();
      expect(card).not.toHaveTextContent(detail.content);
    };
    const opener = await screen.findByRole("button", { name: cardName });
    assertCard(opener);
    fireEvent.click(opener, { detail: clickDetail });
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(detail.content);
    fireEvent.click(within(dialog).getByRole("button", { name: text.viewSenderContacts }));
    const senderCard = await within(dialog).findByRole("button", { name: cardName });
    assertCard(senderCard);
    fireEvent.click(senderCard, { detail: clickDetail });
    await within(dialog).findByText(detail.content);
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(mocks.push).not.toHaveBeenCalled();
    client.clear();
  });

  it.each([":root", ':root[data-theme="dark"]', ":root:not([data-theme])", '.wiki-theme-scope[data-theme="light"]', '.wiki-theme-scope[data-theme="dark"]'])("keeps badges blue/red and their text and borders readable in %s", (selector) => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
    const rgb = (name: string) => {
      const hex = block.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))![1];
      return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
    };
    const luminance = (values: number[]) => values.reduce((sum, value, index) => sum + [0.2126, 0.7152, 0.0722][index] * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4), 0);
    const contrast = (a: number[], b: number[]) => {
      const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
      return (high + 0.05) / (low + 0.05);
    };
    for (const surface of ["surface-base", "surface-raised"]) {
      expect(contrast(rgb("text-muted"), rgb(surface)), `reply thread line on ${surface}`).toBeGreaterThanOrEqual(3);
    }
    // The brand token is blue in every existing theme; fail if a future palette changes that meaning.
    const [blueRed, blueGreen, blueBlue] = rgb("brand-primary");
    expect(blueBlue).toBeGreaterThan(blueGreen);
    expect(blueGreen).toBeGreaterThan(blueRed);
    const [redRed, redGreen, redBlue] = rgb("status-danger");
    expect(redRed).toBeGreaterThan(redGreen);
    expect(redGreen).toBeGreaterThanOrEqual(redBlue);
    for (const color of ["brand-primary", "status-danger", "status-warning", "text-muted"]) {
      for (const surface of ["surface-base", "surface-raised"]) {
        const border = rgb(color);
        const background = rgb(surface).map((value, index) => value * 0.9 + border[index] * 0.1);
        const foreground = color === "text-muted" ? rgb("text-strong") : border;
        expect(contrast(foreground, background), `${color} text on ${surface}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(border, background), `${color} border on ${surface}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  describe.each(["ja", "en", "ko"] as const)("category badges in %s", (locale) => {
    it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("keeps every category and date consistent across cards, detail and sender cards on %s", async (pathname) => {
      mocks.locale = locale;
      mocks.pathname = pathname.split("?")[0];
      mocks.search = pathname.split("?")[1] ?? "";
      const localized = dictionaries[locale].admin.siteManagementContacts;
      const categories = [1, 2, 3, 99];
      const colors = ["brand-primary", "status-danger", "status-warning", "text-muted"];
      const contacts = categories.map((category, index) => ({ ...contact, category, contactIdentifier: identifier.replace("111111111111", String(index + 1).repeat(12)) }));
      vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(String(input), window.location.origin).pathname;
        const selected = contacts.find((item) => path === `/api/site-management/contacts/${item.contactIdentifier}`);
        return Response.json(selected ? { ...detail, ...selected, content: detail.content, principalIdentifier: "019a1234-5678-7000-8000-333333333333" } : page(contacts));
      }));
      const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(contact.createdAt));
      const assertBadge = (scope: HTMLElement, index: number) => {
        const label = localized.category(categories[index]);
        const badge = within(scope).getByText(label, { exact: true });
        expect(badge).toHaveClass("inline-flex", "rounded-full", "border", "px-2.5", "py-1", "text-xs", "font-semibold", `bg-${colors[index]}/10`, `text-${index === 3 ? "text-strong" : colors[index]}`, `border-${colors[index]}`);
        expect(badge.textContent).toBe(label);
        expect(badge).not.toHaveTextContent(date);
        if (scope.tagName === "BUTTON") {
          expect(Array.from(scope.firstElementChild!.firstElementChild!.children).map((child) => child.textContent)).toEqual([label, contact.name, date]);
        } else {
          expect(badge.parentElement).toHaveTextContent(`${label} · ${date}`);
          expect(badge.nextSibling?.textContent).toBe(" · ");
          expect(badge.nextSibling?.nextSibling?.textContent).toBe(date);
        }
        return badge;
      };
      const { client, container } = renderContacts(Infinity);
      await screen.findByRole("button", { name: cardName(contact.name, categories[0], locale) });
      const cards = within(container).getAllByRole("button");
      const badgeClasses = cards.map((card, index) => assertBadge(card, index).className);
      for (let index = 0; index < categories.length; index++) {
        fireEvent.click(cards[index]);
        const dialog = screen.getByRole("dialog");
        const body = await within(dialog).findByText(detail.content);
        const badge = assertBadge(dialog, index);
        expect(badge.className).toBe(badgeClasses[index]);
        expect(body.previousElementSibling).toBe(badge.parentElement);
        fireEvent.click(within(dialog).getByRole("button", { name: localized.viewSenderContacts }));
        await within(dialog).findByRole("button", { name: cardName(contact.name, categories[0], locale) });
        const senderCards = categories.map((category) => within(dialog).getByRole("button", { name: cardName(contact.name, category, locale) }));
        senderCards.forEach((card, senderIndex) => expect(assertBadge(card, senderIndex).className).toBe(badgeClasses[senderIndex]));
        expect(screen.getByRole("dialog")).toBe(dialog);
        fireEvent.click(within(dialog).getByRole("button", { name: localized.close }));
      }
      client.clear();
    });
  });

  it.each([null, "019a1234-5678-7000-8000-333333333333"])("shows the saved name below the dialog heading and category/date above the body (principal=%s)", async (principalIdentifier) => {
    const name = "山田 はるか";
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => input === detailUrl
      ? new Promise<Response>((done) => { resolve = done; })
      : Promise.resolve(Response.json(page([{ ...contact, name: "一覧の名前" }])))));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: cardName("一覧の名前") }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText(`名前：${name}`)).not.toBeInTheDocument();
    resolve(Response.json({ ...detail, name, principalIdentifier }));
    await within(dialog).findByText(detail.content);
    const senderName = within(dialog).getByText(`名前：${name}`);
    const heading = within(dialog).getByRole("heading", { level: 3 });
    expect(heading.nextElementSibling).toBe(senderName);
    const header = heading.parentElement!.parentElement!;
    expect(header).toHaveClass("flex", "justify-between");
    expect(header.firstElementChild).toBe(heading.parentElement);
    expect(header.lastElementChild).toContainElement(within(dialog).getByRole("button", { name: text.close }));
    const body = within(dialog).getByText(detail.content);
    const metadata = `${text.category(detail.category)} · ${new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(detail.createdAt))}`;
    expect(body.previousElementSibling).toHaveTextContent(metadata);
    expect(body.previousElementSibling).toHaveClass("font-semibold", "text-text-strong");
    expect(body.parentElement).not.toContainElement(senderName);
    expect(within(dialog).queryByText(name, { exact: true })).not.toBeInTheDocument();
    client.clear();
  });

  it.each([
    ["ja", "名前：Anonymous sender"],
    ["en", "Name: Anonymous sender"],
    ["ko", "이름: Anonymous sender"],
  ] as const)("localizes the saved anonymous name label in %s", async (locale, name) => {
    mocks.locale = locale;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? detail : page())));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    expect(await within(screen.getByRole("dialog")).findByText(name)).toBeInTheDocument();
    client.clear();
  });

  describe("dialog scroll and focus lifecycle", () => {
    let rootStyle: string;
    let bodyStyle: string;
    beforeEach(() => {
      rootStyle = document.documentElement.style.cssText;
      bodyStyle = document.body.style.cssText;
      document.documentElement.style.cssText = "overflow-x: auto !important; overflow-y: scroll; scroll-behavior: smooth; color: red;";
      document.body.style.cssText = "position: relative !important; top: 3px; left: 4px; width: 90%; overflow-x: clip; overflow-y: auto !important; color: blue;";
      vi.stubGlobal("scrollX", 24);
      vi.stubGlobal("scrollY", 720);
      vi.stubGlobal("scrollTo", vi.fn((options: ScrollToOptions) => {
        vi.stubGlobal("scrollX", options.left);
        vi.stubGlobal("scrollY", options.top);
      }));
      vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? { ...detail, principalIdentifier: "019a1234-5678-7000-8000-333333333333" } : page())));
    });
    afterEach(() => {
      cleanup();
      document.documentElement.style.cssText = rootStyle;
      document.body.style.cssText = bodyStyle;
      vi.restoreAllMocks();
    });

    it.each([false, true])("restores styles, priorities and scroll coordinates across every exit (StrictMode=%s)", async (strict) => {
      const expectedRoot = document.documentElement.style.cssText;
      const expectedBody = document.body.style.cssText;
      const { client, unmount, switchTab } = renderContacts(Infinity, strict);
      for (const exit of ["close", "escape", "permission", "unmount"]) {
        const opener = await screen.findByRole("button", { name: cardName() });
        opener.focus();
        fireEvent.click(opener);
        const dialog = screen.getByRole("dialog");
        expect(document.body.style.top).toBe("-720px");
        expect(document.body.style.left).toBe("-24px");
        expect(document.body.style.width).toBe("100%");
        // Simulate the viewport origin changing when the body is fixed.
        vi.stubGlobal("scrollX", 0);
        vi.stubGlobal("scrollY", 0);
        if (exit === "close") fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
        else if (exit === "escape") fireEvent(dialog, new Event("cancel", { cancelable: true }));
        else if (exit === "permission") {
          mocks.actions = [];
          switchTab(mocks.pathname);
        } else unmount();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(document.documentElement.style.cssText).toBe(expectedRoot);
        expect(document.body.style.cssText).toBe(expectedBody);
        expect(window.scrollTo).toHaveBeenLastCalledWith({ left: 24, top: 720, behavior: "instant" });
        expect(window.scrollX).toBe(24);
        expect(window.scrollY).toBe(720);
        if (exit === "close" || exit === "escape") expect(opener).toHaveFocus();
        if (exit === "permission") {
          mocks.actions = ["contact:view", "contact:reply"];
          switchTab(mocks.pathname);
        }
      }
      client.clear();
    });

    it.each([false, true])("keeps one lock through sender navigation and focuses without scrolling (StrictMode=%s)", async (strict) => {
      const { client } = renderContacts(Infinity, strict);
      const opener = await screen.findByRole("button", { name: cardName() });
      opener.focus();
      const focus = vi.spyOn(HTMLElement.prototype, "focus");
      fireEvent.click(opener);
      const dialog = screen.getByRole("dialog");
      await within(dialog).findByRole("button", { name: text.viewSenderContacts });
      vi.mocked(window.scrollTo).mockClear();
      const lockedBody = document.body.style.cssText;
      fireEvent.click(within(dialog).getByRole("button", { name: text.viewSenderContacts }));
      fireEvent.click(await within(dialog).findByRole("button", { name: cardName() }));
      await within(dialog).findByText(detail.content);
      fireEvent.click(within(dialog).getByRole("button", { name: text.viewSenderContacts }));
      expect(screen.getByRole("dialog")).toBe(dialog);
      expect(document.body.style.cssText).toBe(lockedBody);
      expect(window.scrollTo).not.toHaveBeenCalled();
      expect(within(dialog).getByRole("heading")).toHaveFocus();
      fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
      expect(opener).toHaveFocus();
      expect(focus.mock.calls.length).toBeGreaterThan(0);
      expect(focus.mock.calls.every(([options]) => options?.preventScroll === true)).toBe(true);
      client.clear();
    });
  });

  it("locks background scrolling but leaves the dialog scrollable without scroll chaining", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? detail : page())));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    const dialog = screen.getByRole("dialog");
    expect(document.documentElement.style.overflowY).toBe("hidden");
    expect(document.body.style.overflowY).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(dialog).toHaveClass("overflow-y-auto", "overscroll-contain");
    fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
    expect(document.documentElement.style.overflowY).toBe("");
    expect(document.body.style.overflowY).toBe("");
    expect(document.body.style.position).toBe("");
    client.clear();
  });

  it.each(["", "principalIdentifier=bad", "principalIdentifier=019a1234-5678-7000-8000-333333333333"])("ignores legacy sender URL conditions in the background: %s", async (search) => {
    mocks.search = search;
    const fetchMock = vi.fn().mockResolvedValue(Response.json(page()));
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    await screen.findByText(contact.name);
    expect(fetchMock).toHaveBeenCalledWith("/api/site-management/contacts?page=1&perPage=50", expect.anything());
    expect(screen.queryByRole("region", { name: "送信者" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "絞り込みを解除" })).not.toBeInTheDocument();
    client.clear();
  });

  it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("shows all of the persisted sender's inquiries in the same dialog without changing the background on %s", async (pathname) => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-444444444444", name: "Saved inquiry name" };
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === detailUrl) return Response.json({ ...detail, principalIdentifier: sender });
      if (String(input).endsWith(other.contactIdentifier)) return Response.json({ ...other, principalIdentifier: sender, content: "Another inquiry", replies: [] });
      const url = new URL(String(input), window.location.origin);
      return Response.json({ ...page(url.searchParams.has("principalIdentifier") ? [contact, other] : [contact]), current_page: Number(url.searchParams.get("page")), last_page: 2, total: 51 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(2, 2));
    const opener = screen.getByRole("button", { name: cardName() });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    const senderButton = await within(dialog).findByRole("button", { name: text.viewSenderContacts });
    const heading = within(dialog).getByRole("heading", { level: 3 });
    expect(heading).toHaveClass("text-xl", "font-bold", "text-text-strong");
    const header = heading.parentElement!.parentElement!;
    expect(header).toHaveClass("flex-wrap");
    expect(senderButton.parentElement).toHaveClass("flex-wrap");
    expect(within(header).getAllByRole("button")).toEqual([
      within(dialog).getByRole("button", { name: text.close }),
      senderButton,
    ]);
    fireEvent.click(senderButton);
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await within(dialog).findByText(other.name);
    expect(within(dialog).getByText(text.page(1, 2))).toBeInTheDocument();
    const senderRequest = fetchMock.mock.calls.map(([url]) => new URL(String(url), window.location.origin)).find((url) => url.searchParams.has("principalIdentifier"));
    expect(senderRequest?.searchParams.get("principalIdentifier")).toBe(sender);
    expect(senderRequest?.searchParams.has("hasReply")).toBe(false);
    fireEvent.click(within(dialog).getByRole("button", { name: cardName(other.name) }));
    await within(dialog).findByText("Another inquiry");
    expect(within(dialog).getAllByRole("button", { name: text.viewSenderContacts })).toHaveLength(1);
    expect(within(dialog).getAllByRole("button")).toHaveLength(3);
    fireEvent.click(within(dialog).getByRole("button", { name: text.viewSenderContacts }));
    await within(dialog).findByText(other.name);
    fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(text.page(2, 2))).toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(mocks.push).not.toHaveBeenCalled();
    client.clear();
  });

  it("does not infer the sender from the summary, name, or operator for anonymous detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? detail : page([{ ...contact, principalIdentifier: "019a1234-5678-7000-8000-333333333333" }]))));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    await screen.findByText(detail.content);
    expect(screen.queryByRole("button", { name: text.viewSenderContacts })).not.toBeInTheDocument();
    client.clear();
  });

  it("hides a cached sender action after detail access becomes forbidden", async () => {
    let forbidden = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) return Response.json([]);
      if (input !== detailUrl) return Response.json(page());
      return forbidden ? new Response(null, { status: 403 }) : Response.json({ ...detail, principalIdentifier: "019a1234-5678-7000-8000-333333333333" });
    }));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    await screen.findByRole("button", { name: text.viewSenderContacts });
    forbidden = true;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contact"] });
    await screen.findByRole("combobox");
    expect(mocks.replace).toHaveBeenCalledWith("/admin/site-management/contacts");
    expect(screen.queryByRole("button", { name: text.viewSenderContacts })).not.toBeInTheDocument();
    client.clear();
  });

  it.each([200, 401, 403, 500])("shows sender-list loading then an empty/error state for HTTP %s without altering background cache", async (status) => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) return Promise.resolve(Response.json([]));
      if (input === detailUrl) return Promise.resolve(Response.json({ ...detail, principalIdentifier: sender }));
      if (String(input).includes("principalIdentifier=")) return new Promise<Response>((done) => { resolve = done; });
      return Promise.resolve(Response.json(page()));
    }));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(text.loading)).toBeInTheDocument();
    resolve(status === 200 ? Response.json(page([])) : new Response(null, { status }));
    if (status === 401 || status === 403) {
      await screen.findByRole("combobox");
      expect(mocks.replace).toHaveBeenCalledWith("/admin/site-management/contacts");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText(contact.name)).not.toBeInTheDocument();
    } else {
      await within(dialog).findByText(status === 200 ? text.allEmpty : text.loadFailed);
      expect(within(dialog).queryByRole("button", { name: cardName() })).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
      expect(screen.getByText(contact.name)).toBeInTheDocument();
    }
    expect(client.getQueryData(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "unanswered", 1])).toMatchObject({ contacts: [contact] });
    client.clear();
  });

  it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("keeps sender pagination independent and returns via the single header action to the same sender page on %s", async (pathname) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    mocks.actions = ["contact:view"];
    const sender = "019a1234-5678-7000-8000-333333333333";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (input === detailUrl) return Response.json({ ...detail, principalIdentifier: sender });
      const url = new URL(String(input), window.location.origin);
      return Response.json({ ...page(), current_page: Number(url.searchParams.get("page")), last_page: 2, total: 51 });
    }));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByRole("button", { name: text.previousPage })).toBeDisabled();
    expect(within(dialog).getByRole("heading")).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: text.nextPage }));
    await within(dialog).findByText(text.page(2, 2));
    expect(within(dialog).getByRole("button", { name: text.nextPage })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: cardName() }));
    await within(dialog).findByText(detail.content);
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("button")).toEqual([
      within(dialog).getByRole("button", { name: text.close }),
      within(dialog).getByRole("button", { name: text.viewSenderContacts }),
    ]);
    fireEvent.click(within(dialog).getByRole("button", { name: text.viewSenderContacts }));
    await within(dialog).findByText(text.page(2, 2));
    fireEvent.click(within(dialog).getByRole("button", { name: text.previousPage }));
    await within(dialog).findByText(text.page(1, 2));
    fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
    expect(screen.getByText(text.page(1, 2))).toBeInTheDocument();
    client.clear();
  });

  it.each([null, "019a1234-5678-7000-8000-555555555555"])("uses the nested detail principal rather than the previous sender/page (principal=%s)", async (principalIdentifier) => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-444444444444", name: "佐藤 直樹" };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === detailUrl) return Response.json({ ...detail, principalIdentifier: sender });
      if (String(input).endsWith(other.contactIdentifier)) return Response.json({ ...other, principalIdentifier, content: "送信者を確認する本文", replies: [] });
      const url = new URL(String(input), window.location.origin);
      return Response.json({ ...page(url.searchParams.has("principalIdentifier") ? [other] : [contact]), current_page: Number(url.searchParams.get("page")), last_page: 2, total: 51 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(await within(dialog).findByRole("button", { name: text.nextPage }));
    await within(dialog).findByText(text.page(2, 2));
    fireEvent.click(within(dialog).getByRole("button", { name: cardName(other.name) }));
    await within(dialog).findByText("送信者を確認する本文");
    if (principalIdentifier) {
      fireEvent.click(within(dialog).getByRole("button", { name: text.viewSenderContacts }));
      await within(dialog).findByText(text.page(1, 2));
      expect(fetchMock).toHaveBeenCalledWith(`/api/site-management/contacts?page=1&perPage=50&principalIdentifier=${principalIdentifier}`, expect.anything());
    } else {
      expect(within(dialog).queryByRole("button", { name: text.viewSenderContacts })).not.toBeInTheDocument();
      expect(within(dialog).getAllByRole("button")).toHaveLength(2);
    }
    fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
    fireEvent.click(screen.getByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    await within(screen.getByRole("dialog")).findByText(text.page(1, 2));
    client.clear();
  });

  it("does not reopen a closed dialog or contaminate another sender with a late response", async () => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    const otherSender = "019a1234-5678-7000-8000-555555555555";
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-444444444444", name: "Other inquiry" };
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (input === detailUrl) return Promise.resolve(Response.json({ ...detail, principalIdentifier: sender }));
      if (String(input).endsWith(other.contactIdentifier)) return Promise.resolve(Response.json({ ...other, principalIdentifier: otherSender, content: "Other detail", replies: [] }));
      const url = new URL(String(input), window.location.origin);
      if (url.searchParams.get("principalIdentifier") === sender) return new Promise<Response>((done) => { resolve = done; });
      return Promise.resolve(Response.json(page(url.searchParams.has("principalIdentifier") ? [other] : [contact, other])));
    }));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    fireEvent.click(screen.getByRole("button", { name: text.close }));
    fireEvent.click(screen.getByRole("button", { name: cardName(other.name) }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText(other.name);
    resolve(Response.json(page([{ ...contact, name: "Late sender inquiry" }])));
    await waitFor(() => expect(client.getQueryState(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "sender", sender, 1])?.status).toBe("success"));
    expect(within(dialog).queryByText("Late sender inquiry")).not.toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    client.clear();
  });

  it.each(["sender list", "nested detail"])("removes the %s on permission loss and ignores its late response", async (view) => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-444444444444", name: "Other inquiry" };
    const otherDetailUrl = `/api/site-management/contacts/${other.contactIdentifier}`;
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (input === detailUrl) return Promise.resolve(Response.json({ ...detail, principalIdentifier: sender }));
      if (input === otherDetailUrl || (view === "sender list" && String(input).includes("principalIdentifier="))) {
        return new Promise<Response>((done) => { resolve = done; });
      }
      return Promise.resolve(Response.json(page(String(input).includes("principalIdentifier=") ? [other] : [contact])));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client, switchTab } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    if (view === "nested detail") fireEvent.click(await within(screen.getByRole("dialog")).findByRole("button", { name: cardName(other.name) }));
    mocks.actions = [];
    switchTab("/admin/site-management/contacts/manage?hasReply=0");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const requestsAtRevocation = fetchMock.mock.calls.length;
    resolve(Response.json(view === "sender list" ? page([other]) : { ...other, principalIdentifier: sender, content: "Late private detail", replies: [] }));
    const key = view === "sender list"
      ? ["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "sender", sender, 1]
      : ["admin", "siteManagement", "contact", "operator", "account", "operator-principal", null, other.contactIdentifier];
    await waitFor(() => expect(client.getQueryState(key)?.status).toBe("success"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Late private detail")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(requestsAtRevocation);
    mocks.actions = ["contact:view"];
    switchTab("/admin/site-management/contacts/manage?hasReply=0");
    await screen.findByRole("button", { name: cardName() });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    client.clear();
  });

  it("blocks dialog navigation while replying and refreshes sender history and both background lists", async () => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    const sentReply = { replyIdentifier: "019a1234-5678-7000-8000-222222222222", principalIdentifier: "019a1234-5678-7000-8000-555555555555", name: "山田はるか", content: "Reply from sender list", sentAt: "2026-10-09T00:00:00+00:00" };
    let replied = false;
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (input === replyUrl) return new Promise<Response>((done) => { resolve = (response) => { replied = response.ok; done(response); }; });
      if (input === detailUrl) return Promise.resolve(Response.json({ ...detail, principalIdentifier: sender, replies: replied ? [sentReply] : [] }));
      const url = new URL(String(input), window.location.origin);
      return Promise.resolve(Response.json(page(replied && url.searchParams.get("hasReply") === "0" ? [] : [{ ...contact, replyIdentifiers: replied ? [sentReply.replyIdentifier] : [] }])));
    }));
    const { client, switchTab } = renderContacts(Infinity);
    await screen.findByText(contact.name);
    switchTab("/admin/site-management/contacts/manage");
    await screen.findByText(contact.name);
    switchTab("/admin/site-management/contacts/manage?hasReply=0");
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(await within(dialog).findByRole("button", { name: cardName() }));
    fireEvent.change(await within(dialog).findByRole("textbox"), { target: { value: sentReply.content } });
    fireEvent.click(within(dialog).getByRole("button", { name: text.reply }));
    await within(dialog).findByRole("button", { name: text.replying });
    for (const name of [text.close, text.viewSenderContacts]) {
      expect(within(dialog).getByRole("button", { name })).toBeDisabled();
      fireEvent.click(within(dialog).getByRole("button", { name }));
    }
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(within(dialog).getByRole("textbox")).toHaveValue(sentReply.content);
    expect(screen.getByRole("dialog")).toBe(dialog);
    resolve(new Response(null, { status: 204 }));
    await within(dialog).findByRole("button", { name: cardName(contact.name, contact.category, mocks.locale, 1) });
    await waitFor(() => expect(client.getQueryData(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "sender", sender, 1])).toMatchObject({ contacts: [{ replyIdentifiers: [sentReply.replyIdentifier] }] }));
    expect(client.getQueryState(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "all", 1])?.isInvalidated).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: cardName(contact.name, contact.category, mocks.locale, 1) }));
    await within(dialog).findByText(sentReply.content);
    expect(within(dialog).getByText("返信者：山田はるか")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox")).toHaveValue("");
    fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
    await screen.findByText(text.empty);
    switchTab("/admin/site-management/contacts/manage");
    await screen.findByText(contact.name);
    client.clear();
  });

  it("restores focus to the background heading when replying removed the original opener", async () => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    let replied = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) { replied = true; return new Response(null, { status: 204 }); }
      if (input === detailUrl) return Response.json({ ...detail, principalIdentifier: sender });
      const url = new URL(String(input), window.location.origin);
      return Response.json(page(replied && url.searchParams.get("hasReply") === "0" ? [] : [contact]));
    }));
    const { client } = renderContacts(Infinity);
    const backgroundHeading = screen.getByRole("heading", { name: text.title });
    const opener = await screen.findByRole("button", { name: cardName() });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(await within(dialog).findByRole("button", { name: cardName() }));
    fireEvent.change(await within(dialog).findByRole("textbox"), { target: { value: "Reply" } });
    fireEvent.click(within(dialog).getByRole("button", { name: text.reply }));
    await screen.findByText(text.empty);
    expect(opener).not.toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole("button", { name: text.close })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(backgroundHeading).toHaveFocus();
    client.clear();
  });

  it("clamps a refreshed sender page and hides cached rows on a forbidden sender refresh", async () => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    let shrunk = false;
    let forbidden = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/me")) return Response.json([]);
      if (input === detailUrl) return Response.json({ ...detail, principalIdentifier: sender });
      const url = new URL(String(input), window.location.origin);
      if (!url.searchParams.has("principalIdentifier")) return Response.json(page());
      if (forbidden) return new Response(null, { status: 403 });
      const currentPage = Number(url.searchParams.get("page"));
      return Response.json({ ...page(shrunk && currentPage === 2 ? [] : [contact]), current_page: currentPage, last_page: shrunk ? 1 : 2, total: shrunk ? 1 : 51 });
    }));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(await within(dialog).findByRole("button", { name: text.nextPage }));
    await within(dialog).findByText(text.page(2, 2));
    shrunk = true;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "sender"] });
    await waitFor(() => expect(client.getQueryCache().find({ queryKey: ["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "sender", sender, 2] })?.getObserversCount()).toBe(0));
    await within(dialog).findByRole("button", { name: cardName() });
    forbidden = true;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "sender"] });
    await screen.findByRole("combobox");
    expect(mocks.replace).toHaveBeenCalledWith("/admin/site-management/contacts");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: cardName() })).not.toBeInTheDocument();
    client.clear();
  });

  it.each(["detail", "reply"])("resets a failed nested %s on close or sender navigation without leaking a draft", async (failure) => {
    const sender = "019a1234-5678-7000-8000-333333333333";
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-444444444444", name: "Another saved name" };
    let resolveDetail!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).endsWith("/replies")) return Promise.resolve(new Response(null, { status: 500 }));
      if (input === detailUrl) return Promise.resolve(Response.json({ ...detail, principalIdentifier: sender }));
      if (String(input).endsWith(other.contactIdentifier)) return new Promise<Response>((done) => { resolveDetail = done; });
      return Promise.resolve(Response.json(page(String(input).includes("principalIdentifier=") ? [other] : [contact])));
    }));
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.click(await screen.findByRole("button", { name: text.viewSenderContacts }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(await within(dialog).findByRole("button", { name: cardName(other.name) }));
    expect(within(dialog).getByText(text.detailLoading)).toBeInTheDocument();
    resolveDetail(failure === "detail" ? new Response(null, { status: 404 }) : Response.json({ ...other, principalIdentifier: sender, content: "Other detail", replies: [] }));
    if (failure === "detail") await within(dialog).findByText(text.detailLoadFailed);
    else {
      fireEvent.change(await within(dialog).findByRole("textbox"), { target: { value: "Failed draft" } });
      fireEvent.click(within(dialog).getByRole("button", { name: text.reply }));
      await within(dialog).findByText(text.replyFailed);
      expect(within(dialog).getByRole("textbox")).toHaveValue("Failed draft");
    }
    if (failure === "detail") {
      expect(within(dialog).queryByRole("button", { name: text.viewSenderContacts })).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: text.close }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: cardName() }));
      await within(screen.getByRole("dialog")).findByText(detail.content);
    } else {
      fireEvent.click(within(dialog).getByRole("button", { name: text.viewSenderContacts }));
      await within(dialog).findByText(other.name);
    }
    expect(within(dialog).queryByText(text.replyFailed)).not.toBeInTheDocument();
    client.clear();
  });

  it("loads all inquiries without hasReply on the contacts URL", async () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.search = "";
    const fetchMock = vi.fn().mockResolvedValue(Response.json(page()));
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    expect(await screen.findByText(contact.name)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: text.title })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/site-management/contacts?page=1&perPage=50", expect.anything());
    client.clear();
  });

  it("isolates query caches and resets pagination for each management filter change", async () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.search = "";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), window.location.origin);
      const currentPage = Number(url.searchParams.get("page"));
      const name = url.searchParams.has("hasReply") ? "Unanswered sender" : "All sender";
      return Response.json({ ...page([{ ...contact, name }]), current_page: currentPage, last_page: 3, total: 101 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client, switchTab } = renderContacts();
    await screen.findByText("All sender");
    fireEvent.click(screen.getByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(2, 3));
    switchTab("/admin/site-management/contacts/manage?hasReply=0");
    await screen.findByText("Unanswered sender");
    expect(screen.getByText(text.page(1, 3))).toBeInTheDocument();
    expect(screen.queryByText("All sender")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(2, 3));
    fireEvent.click(screen.getByRole("button", { name: text.nextPage }));
    await screen.findByText(text.page(3, 3));
    switchTab("/admin/site-management/contacts/manage");
    await screen.findByText("All sender");
    expect(screen.getByText(text.page(1, 3))).toBeInTheDocument();
    expect(client.getQueryData(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "all", 2])).toMatchObject({ current_page: 2, contacts: [{ name: "All sender" }] });
    expect(client.getQueryData(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "unanswered", 3])).toMatchObject({ current_page: 3, contacts: [{ name: "Unanswered sender" }] });
    client.clear();
  });

  it.each(["all", "unanswered"])("refreshes both cached lists and detail after replying from %s", async (replyFrom) => {
    let replied = false;
    const sentReply = { replyIdentifier: "019a1234-5678-7000-8000-222222222222", content: "Sent reply", sentAt: "2026-10-09T00:00:00+00:00" };
    const allUrl = "/api/site-management/contacts?page=1&perPage=50";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) { replied = true; return new Response(null, { status: 204 }); }
      if (input === detailUrl) return Response.json({ ...detail, replies: replied ? [sentReply] : [] });
      if (input === listUrl) return Response.json(page(replied ? [] : [contact]));
      if (input === allUrl) return Response.json(page([{ ...contact, replyIdentifiers: replied ? [sentReply.replyIdentifier] : [] }]));
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.search = replyFrom === "all" ? "hasReply=0" : "";
    const { client, switchTab } = renderContacts(Infinity);
    await screen.findByText(contact.name);
    switchTab(replyFrom === "all" ? "/admin/site-management/contacts/manage" : "/admin/site-management/contacts/manage?hasReply=0");
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Sent reply" } });
    const history = screen.getByRole("heading", { name: text.previousReplies }).closest("details")!;
    fireEvent.click(history.querySelector("summary")!);
    expect(history).not.toHaveAttribute("open");
    expect(screen.getByRole("textbox", { name: text.replyContent })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const inactiveList = replyFrom === "all" ? "unanswered" : "all";
    await waitFor(() => expect(client.getQueryState(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, inactiveList, 1])?.isInvalidated).toBe(true));
    expect(fetchMock.mock.calls.filter(([url]) => url === (replyFrom === "all" ? listUrl : allUrl))).toHaveLength(1);
    if (replyFrom === "all") expect(screen.getByText(contact.name)).toBeInTheDocument();
    else await screen.findByText(text.empty);
    switchTab(replyFrom === "all" ? "/admin/site-management/contacts/manage?hasReply=0" : "/admin/site-management/contacts/manage");
    await waitFor(() => expect(client.getQueryData(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "all", 1])).toMatchObject({ contacts: [{ replyIdentifiers: [sentReply.replyIdentifier] }] }));
    await waitFor(() => expect(client.getQueryData(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "unanswered", 1])).toMatchObject({ contacts: [] }));
    expect(fetchMock.mock.calls.filter(([url]) => url === allUrl)).toHaveLength(2);
    expect(fetchMock.mock.calls.filter(([url]) => url === listUrl)).toHaveLength(2);
    switchTab("/admin/site-management/contacts/manage?hasReply=0");
    await screen.findByText(text.empty);
    expect(screen.queryByText(contact.name)).not.toBeInTheDocument();
    switchTab("/admin/site-management/contacts/manage");
    fireEvent.click(await screen.findByRole("button", { name: cardName(contact.name, contact.category, mocks.locale, 1) }));
    await screen.findByText(sentReply.content);
    expect(screen.getByRole("heading", { name: text.previousReplies }).closest("details")).toHaveAttribute("open");
    expect(screen.getByText(sentReply.content)).toBeVisible();
    expect(client.getQueryData(["admin", "siteManagement", "contact", "operator", "account", "operator-principal", null, identifier])).toMatchObject({ replies: [sentReply] });
    client.clear();
  });

  it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("does not fetch or display contacts without view permission on %s", (pathname) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    mocks.actions = ["contact:reply"];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    client.clear();
  });

  it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("discards an unsent draft when switching away from %s", async (pathname) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === detailUrl ? detail : page())));
    const { client, switchTab } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Draft for the previous tab" } });
    const other = pathname.includes("hasReply=0") ? "/admin/site-management/contacts/manage" : "/admin/site-management/contacts/manage?hasReply=0";
    switchTab(other);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    expect(await screen.findByRole("textbox", { name: text.replyContent })).toHaveValue("");
    client.clear();
  });

  it("does not let a late all-list response overwrite the selected unanswered tab", async () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.search = "";
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => input === listUrl
      ? Promise.resolve(Response.json(page([{ ...contact, name: "Unanswered sender" }])))
      : new Promise<Response>((done) => { resolve = done; })));
    const { client, switchTab } = renderContacts(Infinity);
    expect(screen.getByText(text.loading)).toBeInTheDocument();
    switchTab("/admin/site-management/contacts/manage?hasReply=0");
    await screen.findByText("Unanswered sender");
    resolve(Response.json(page([{ ...contact, name: "Late all sender" }])));
    await waitFor(() => expect(client.getQueryState(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "all", 1])?.status).toBe("success"));
    expect(screen.queryByText("Late all sender")).not.toBeInTheDocument();
    expect(screen.getByText("Unanswered sender")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: text.title })).toBeInTheDocument();
    client.clear();
  });

  it("does not carry an all-tab error into a successful unanswered tab", async () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.search = "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => input === listUrl ? Response.json(page()) : new Response(null, { status: 500 })));
    const { client, switchTab } = renderContacts();
    await screen.findByText(text.loadFailed);
    expect(screen.queryByText(text.allEmpty)).not.toBeInTheDocument();
    switchTab("/admin/site-management/contacts/manage?hasReply=0");
    await screen.findByText(contact.name);
    expect(screen.queryByText(text.loadFailed)).not.toBeInTheDocument();
    client.clear();
  });

  it("uses the all-inquiries empty message without claiming there are no unanswered inquiries", async () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.search = "";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(page([]))));
    const { client } = renderContacts();
    await screen.findByText(text.allEmpty);
    expect(screen.queryByText(text.empty)).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Only for the first sender" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByText(text.replyFailed);
    fireEvent.click(screen.getByRole("button", { name: text.close }));
    fireEvent.click(screen.getByRole("button", { name: cardName(other.name) }));
    expect(await screen.findByRole("textbox", { name: text.replyContent })).toHaveValue("");
    expect(screen.queryByText(text.replyFailed)).not.toBeInTheDocument();
    client.clear();
  });

  it.each(["/admin/site-management/contacts/manage", "/admin/site-management/contacts/manage?hasReply=0"])("disables every native card while its reply is pending on %s", async (pathname) => {
    mocks.pathname = pathname.split("?")[0];
    mocks.search = pathname.split("?")[1] ?? "";
    const other = { ...contact, contactIdentifier: "019a1234-5678-7000-8000-444444444444", name: "佐藤 直樹" };
    let resolve!: (response: Response) => void;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("?")) return Promise.resolve(Response.json(page([contact, other])));
      if (input === detailUrl) return Promise.resolve(Response.json(detail));
      return new Promise<Response>((done) => { resolve = done; });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Reply" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await screen.findByRole("button", { name: text.replying });
    expect(screen.getByRole("button", { name: text.close })).toBeDisabled();
    for (const name of [contact.name, other.name]) {
      const card = screen.getByRole("button", { name: cardName(name) });
      expect(card).toBeDisabled();
      fireEvent.click(card, { detail: 0 });
      fireEvent.click(card, { detail: 1 });
    }
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith(other.contactIdentifier))).toBe(false);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    resolve(new Response(null, { status: 500 }));
    await screen.findByText(text.replyFailed);
    expect(screen.getByRole("button", { name: text.close })).toBeEnabled();
    expect(screen.getByRole("button", { name: cardName(other.name) })).toBeEnabled();
    client.clear();
  });

  it("supports Escape cancellation and restores focus to the inquiry opener", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(input === listUrl ? page() : detail)));
    const { client } = renderContacts();
    const opener = await screen.findByRole("button", { name: cardName() });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole("textbox", { name: text.replyContent });
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    client.clear();
  });

  it("hides cached list entries after a forbidden background refresh", async () => {
    let forbidden = false;
    vi.stubGlobal("fetch", vi.fn(async () => forbidden ? new Response(null, { status: 403 }) : Response.json(page())));
    const { client } = renderContacts();
    await screen.findByRole("button", { name: cardName() });
    forbidden = true;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contacts"] });
    await screen.findByText(text.loadFailed);
    expect(screen.queryByRole("button", { name: cardName() })).not.toBeInTheDocument();
    expect(screen.queryByText(contact.name)).not.toBeInTheDocument();
    client.clear();
  });

  it("hides cached detail and the reply form when a detail refresh is forbidden", async () => {
    let forbidden = false;
    const sentReply = { replyIdentifier: identifier, principalIdentifier: identifier, name: "山田はるか", content: "確認のうえ対応しました。", sentAt: "2026-10-09T00:00:00+00:00" };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => input === listUrl
      ? Response.json(page())
      : forbidden ? new Response(null, { status: 403 }) : Response.json({ ...detail, replies: [sentReply] })));
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    await screen.findByText(detail.content);
    expect(within(screen.getByRole("dialog")).getByText(`名前：${detail.name}`)).toBeInTheDocument();
    expect(screen.getByText("返信者：山田はるか")).toBeInTheDocument();
    forbidden = true;
    await client.invalidateQueries({ queryKey: ["admin", "siteManagement", "contact"] });
    await screen.findByRole("combobox");
    expect(mocks.replace).toHaveBeenCalledWith("/admin/site-management/contacts");
    expect(screen.queryByText(detail.content)).not.toBeInTheDocument();
    expect(screen.queryByText("返信者：山田はるか")).not.toBeInTheDocument();
    expect(screen.queryByText(sentReply.content)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: cardName() }));
    fireEvent.change(await screen.findByRole("textbox", { name: text.replyContent }), { target: { value: "Reply" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(client.getQueryCache().find({ queryKey: ["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "unanswered", 2] })?.getObserversCount()).toBe(0));
    await waitFor(() => expect(client.getQueryData<{ current_page: number }>(["admin", "siteManagement", "contacts", "operator", "account", "operator-principal", null, "unanswered", 1])?.current_page).toBe(1));
    await waitFor(() => expect(screen.queryByText(text.empty)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: cardName() })).toBeInTheDocument();
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
    const open = await screen.findByRole("button", { name: cardName() });
    expect(open).toBeEnabled();
    fireEvent.click(open);
    expect(await screen.findByText(detail.content)).toBeInTheDocument();
    expect(screen.getByText(text.noPreviousReplies)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(detailUrl, expect.objectContaining({ credentials: "include", cache: "no-store" }));
    const send = screen.getByRole("button", { name: text.reply });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: text.replyContent }), { target: { value: "Mail reply" } });
    fireEvent.click(send);
    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(replyUrl, expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ content: "Mail reply" }),
      headers: expect.objectContaining({ "X-XSRF-TOKEN": "test-csrf" }),
    }));
    expect(fetchMock.mock.calls.filter(([url]) => url === listUrl)).toHaveLength(2);
    client.clear();
  });

  it("refetches anonymous reply authors after sending even with an indefinitely fresh cached detail", async () => {
    mocks.pathname = "/admin/site-management/contacts/manage";
    mocks.search = "";
    let replied = false;
    const previousReply = { replyIdentifier: "019a1234-5678-7000-8000-222222222222", principalIdentifier: identifier, name: "김민준", content: "調査を開始しました。", sentAt: "2026-10-09T00:00:00+00:00" };
    const newReply = { ...previousReply, replyIdentifier: "019a1234-5678-7000-8000-333333333333", name: "山田はるか", content: "対応が完了しました。", sentAt: "2026-10-10T00:00:00+00:00" };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === replyUrl) { replied = true; return new Response(null, { status: 204 }); }
      if (input === detailUrl) return Response.json({ ...detail, replies: replied ? [previousReply, newReply] : [previousReply] });
      return Response.json(page());
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts(Infinity);
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    await screen.findByText("返信者：김민준");
    fireEvent.change(screen.getByRole("textbox", { name: text.replyContent }), { target: { value: newReply.content } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: cardName() }));
    await screen.findByText("返信者：山田はるか");
    expect(screen.getByText("返信者：김민준")).toBeInTheDocument();
    expect(screen.getByText(newReply.content)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([input]) => input === detailUrl).length).toBeGreaterThan(1);
    client.clear();
  });

  it("shows anonymous detail and sent replies read-only without reply permission", async () => {
    mocks.actions = ["contact:view"];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (input === listUrl) return Response.json(page());
      if (input === detailUrl) return Response.json({ ...detail, replies: [{ replyIdentifier: "019a1234-5678-7000-8000-222222222222", content: "Earlier sent reply", sentAt: "2026-10-09T00:00:00+00:00" }] });
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderContacts();
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    expect(await screen.findByText("Earlier sent reply")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: text.replyContent })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: text.reply })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: text.close }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    expect(screen.getByText(text.detailLoading)).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).queryByText(`名前：${contact.name}`)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: text.viewSenderContacts })).not.toBeInTheDocument();
    resolve(new Response(null, { status: 404 }));
    expect(await screen.findByText(text.detailLoadFailed)).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).queryByText(`名前：${contact.name}`)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: text.viewSenderContacts })).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("button", { name: cardName() }));
    const input = await screen.findByRole("textbox", { name: text.replyContent });
    fireEvent.change(input, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: text.reply })).toBeDisabled();
    fireEvent.change(input, { target: { value: "Retry this reply" } });
    fireEvent.click(screen.getByRole("button", { name: text.reply }));
    expect(await screen.findByRole("button", { name: text.replying })).toBeDisabled();
    expect(input).toBeDisabled();
    resolve(new Response(null, { status: 500 }));
    expect(await screen.findByText(text.replyFailed)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
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
    expect(fetchMock).toHaveBeenCalledWith("/api/site-management/contacts?hasReply=0&page=2&perPage=50", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: text.previousPage }));
    await waitFor(() => expect(screen.getByRole("button", { name: text.previousPage })).toBeDisabled());
    client.clear();
  });
});
