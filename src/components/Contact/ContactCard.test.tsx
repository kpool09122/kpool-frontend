import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dictionaries } from "@/i18n/dictionaries";
import { ContactCard, type ContactCardSummary } from "./ContactCard";
import { formatContactDate } from "./contactDate";

const contact: ContactCardSummary = {
  contactIdentifier: "contact",
  category: 1,
  name: "山田花子",
  createdAt: "2026-10-08T00:00:00+09:00",
  content: `${"あ".repeat(49)}👨‍👩‍👧‍👦🇯🇵`,
  replyIdentifiers: [],
};
afterEach(cleanup);

describe("ContactCard without API or providers", () => {
  it.each([":root", ':root[data-theme="dark"]', ":root:not([data-theme])", '.wiki-theme-scope[data-theme="light"]', '.wiki-theme-scope[data-theme="dark"]'])("keeps reply badge text readable in %s", (selector) => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
    const rgb = (name: string) => {
      const hex = block.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))![1];
      return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
    };
    const luminance = (values: number[]) => values.reduce((sum, value, index) => sum + [0.2126, 0.7152, 0.0722][index] * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4), 0);
    {
      const view = render(<ContactCard contact={{ ...contact, replyIdentifiers: ["reply"] }} categoryLabel="ご要望" replyCountLabel={dictionaries.ja.admin.myContacts.replyCount} locale="ja" onOpen={vi.fn()} />);
      const badge = within(view.container).getByLabelText("返信1件");
      const foreground = rgb(Array.from(badge.classList).find((name) => name.startsWith("text-") && name !== "text-xs")!.slice(5));
      expect(badge).toHaveClass("bg-surface-raised");
      const background = rgb("surface-raised");
      for (const surface of ["surface-base", "surface-raised"]) {
        const [low, high] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
        expect((high + 0.05) / (low + 0.05), `${badge.textContent} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        const [borderLow, borderHigh] = [luminance(foreground), luminance(rgb(surface))].sort((a, b) => a - b);
        expect((borderHigh + 0.05) / (borderLow + 0.05), `badge border on ${surface}`).toBeGreaterThanOrEqual(3);
      }
      view.unmount();
    }
  });

  describe.each(["ja", "en", "ko"] as const)("metadata in %s", (locale) => {
    it.each([0, 1, 3, 10, 100])("shows the exact identifier count inside the top row (count=%s)", (count) => {
      const labels = dictionaries[locale].admin.myContacts;
      // Extra detail fields must never override the list's reply identifiers.
      const summary = { ...contact, replyIdentifiers: Array.from({ length: count }, () => "reply"), replies: count === 0 ? [{ content: "not a summary status" }] : [] };
      render(<ContactCard contact={summary} categoryLabel={labels.category(contact.category)} replyCountLabel={labels.replyCount} locale={locale} onOpen={vi.fn()} />);
      const card = screen.getByRole("button");
      const topRow = card.firstElementChild!;
      const metadata = topRow.firstElementChild!;
      expect(topRow).toHaveClass("grid", "grid-cols-[minmax(0,1fr)_auto]", "items-start", "gap-3", "min-w-0");
      expect(within(card).queryByText(labels.awaitingReply)).not.toBeInTheDocument();
      if (count > 0) {
        const badge = within(card).getByLabelText(labels.replyCount(count));
        expect(badge.textContent).toBe(String(count));
        expect(badge).toHaveClass("aspect-square", "min-w-6", "shrink-0", "self-start", "justify-self-end", "p-1", "leading-none", "whitespace-nowrap", "rounded-full", "border", "border-status-success", "bg-surface-raised", "text-status-success");
        expect(badge.className).not.toMatch(/absolute|(?:^|\s)-?(?:top|right)-|truncate|overflow-hidden|h-5/);
        expect(badge.parentElement).toBe(topRow);
        expect(topRow.lastElementChild).toBe(badge);
        expect(metadata).not.toContainElement(badge);
        expect(card).toHaveAccessibleName(expect.stringContaining(labels.replyCount(count)));
      } else {
        expect(topRow.children).toHaveLength(1);
        expect(within(card).queryByText("0", { exact: true })).not.toBeInTheDocument();
      }
      expect(card).toHaveClass("w-full", "min-w-0", "p-4");
      expect(card.className).not.toMatch(/absolute|overflow-visible/);
      const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(contact.createdAt));
      expect(metadata).toHaveClass("flex", "flex-wrap", "min-w-0");
      expect(Array.from(metadata.children).map((child) => child.textContent)).toEqual([labels.category(contact.category), contact.name, date]);
      expect(within(card).getByText(date)).toHaveClass("ml-auto", "text-right", "min-w-0", "max-w-full", "[overflow-wrap:anywhere]");
      expect(card.lastElementChild?.textContent).toBe(`${"あ".repeat(49)}👨‍👩‍👧‍👦…`);
      expect(card).not.toHaveAttribute("aria-expanded");
      expect(card).toHaveAttribute("type", "button");
      expect(card.querySelector("button, a, input")).toBeNull();
    });
  });

  it("distinguishes same-name cards by accessible preview and opens the correct identifier", () => {
    const onOpen = vi.fn();
    const props = { categoryLabel: "ご要望", replyCountLabel: dictionaries.ja.admin.myContacts.replyCount, locale: "ja", onOpen };
    render(<>
      <ContactCard {...props} contact={{ ...contact, contactIdentifier: "first", content: "プロフィールについての相談" }} />
      <ContactCard {...props} contact={{ ...contact, contactIdentifier: "second", content: "検索についての相談" }} />
    </>);
    const first = screen.getByRole("button", { name: /山田花子.*プロフィールについての相談/ });
    const second = screen.getByRole("button", { name: /山田花子.*検索についての相談/ });
    expect(first).toHaveAttribute("aria-haspopup", "dialog");
    expect(second).not.toHaveAttribute("aria-expanded");
    fireEvent.click(second, { detail: 0 });
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("second");
  });

  it.each([0, 1])("activates the native dialog opener without inline expansion (click detail=%s)", (detail) => {
    const onOpen = vi.fn();
    const props = { contact, categoryLabel: "ご要望", replyCountLabel: dictionaries.ja.admin.myContacts.replyCount, locale: "ja", onOpen };
    const view = render(<ContactCard {...props} />);
    const card = screen.getByRole("button");
    card.focus();
    expect(card).toHaveFocus();
    expect(card).toHaveClass("focus-visible:ring-2", "focus-visible:ring-brand-primary");
    // Native keyboard activation produces detail=0; jsdom doesn't synthesize it from keydown.
    fireEvent.click(card, { detail });
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(contact.contactIdentifier);
    expect(card).not.toHaveAttribute("aria-expanded");
    expect(card).toHaveAttribute("aria-haspopup", "dialog");
    view.rerender(<ContactCard {...props} disabled />);
    expect(card).toBeDisabled();
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("allows long names, translated badges and fallback dates to wrap instead of clipping focus or overflowing", () => {
    const name = "長い名前".repeat(100);
    const createdAt = "invalid-date-".repeat(50);
    const categoryLabel = "長い種別".repeat(50);
    render(<ContactCard contact={{ ...contact, category: 99, name, createdAt, replyIdentifiers: Array.from({ length: 100 }, () => "reply") }} categoryLabel={categoryLabel} replyCountLabel={dictionaries.ja.admin.myContacts.replyCount} locale="ja" onOpen={vi.fn()} />);
    const card = screen.getByRole("button");
    expect(card.firstElementChild).toHaveClass("grid-cols-[minmax(0,1fr)_auto]", "gap-3");
    expect(card.firstElementChild?.firstElementChild).toHaveClass("flex", "flex-wrap", "min-w-0");
    expect(screen.getByLabelText("返信100件")).toBe(card.firstElementChild?.lastElementChild);
    expect(within(card).getByText(name)).toHaveClass("min-w-0", "break-all");
    [categoryLabel, createdAt].forEach((text) => expect(within(card).getByText(text)).toHaveClass("min-w-0", "max-w-full", "[overflow-wrap:anywhere]"));
    expect(within(card).getByText(categoryLabel)).toHaveClass("border-text-muted", "bg-text-muted/10", "text-text-strong");
    expect(card).not.toHaveClass("overflow-hidden");
    expect(formatContactDate(createdAt, "ja")).toBe(createdAt);
  });

  it.each([
    ["ja", "返信1件", "返信3件", "返信100件", "返信あり", "返信なし"],
    ["en", "1 reply", "3 replies", "100 replies", "Replied", "No reply"],
    ["ko", "답변 1개", "답변 3개", "답변 100개", "답변 있음", "답변 없음"],
  ] as const)("localizes accessible counts and retains filter labels in %s", (locale, one, three, hundred, replied, awaitingReply) => {
    const labels = dictionaries[locale].admin.myContacts;
    expect([1, 3, 100].map(labels.replyCount)).toEqual([one, three, hundred]);
    expect(labels.replied).toBe(replied);
    expect(labels.awaitingReply).toBe(awaitingReply);
  });
});
