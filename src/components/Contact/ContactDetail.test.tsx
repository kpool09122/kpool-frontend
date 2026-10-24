import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ContactDetail } from "./ContactDetail";

const reply = { replyIdentifier: "reply", content: "確認しました。\n対応を進めています。", sentAt: "2026-10-01T10:00:00+09:00" };
const contact = { contactIdentifier: "contact", category: 1, content: "表示についての相談", createdAt: reply.sentAt, replies: [reply] };
const labels = { categoryLabel: "ご要望", locale: "ja", historyTitle: "これまでの返信", emptyHistory: "まだ返信はありません。" };
afterEach(cleanup);

describe("ContactDetail presentation without API, role or providers", () => {
  it("colors replies by persisted type, not author, with legacy replies treated as operator", () => {
    const replies = [
      { ...reply, replyIdentifier: "operator", replyType: "operator" as const, author: "同じ名前" },
      { ...reply, replyIdentifier: "submitter", replyType: "submitter" as const, author: "同じ名前" },
      { ...reply, replyIdentifier: "legacy" },
    ];
    render(<ContactDetail contact={{ ...contact, replies }} {...labels} />);
    const lines = screen.getAllByRole("article").map((article) => article.parentElement!);
    expect(lines[0]).toHaveClass("border-l-2", "border-brand-primary");
    expect(lines[1]).toHaveClass("border-l-2", "border-brand-secondary");
    expect(lines[2]).toHaveClass("border-l-2", "border-brand-primary");
    expect(lines.every((line) => !line.classList.contains("border-text-muted"))).toBe(true);
  });

  it("uses operator delivery time but submitter creation time even when notification fails", () => {
    const createdAt = "2026-10-01T09:00:00+09:00";
    const replies = [
      { ...reply, replyIdentifier: "operator", replyType: "operator" as const, createdAt },
      { ...reply, replyIdentifier: "submitter", replyType: "submitter" as const, createdAt },
      { ...reply, replyIdentifier: "failed", replyType: "submitter" as const, createdAt, sentAt: null },
    ];
    render(<ContactDetail contact={{ ...contact, replies }} {...labels} />);
    const format = (value: string) => new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
    expect(screen.getAllByRole("article").map((article) => article.lastElementChild?.textContent)).toEqual([
      format(reply.sentAt), format(createdAt), format(createdAt),
    ]);
  });
  it("renders readonly reply content/date only unless the caller supplies an author label", () => {
    const view = render(<ContactDetail contact={contact} {...labels} />);
    const article = screen.getByRole("article");
    expect(Array.from(article.querySelectorAll("p")).map((p) => p.textContent)).toEqual([
      reply.content,
      new Intl.DateTimeFormat("ja", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(reply.sentAt)),
    ]);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    view.rerender(<ContactDetail contact={{ ...contact, replies: [{ ...reply, author: "返信者不明" }] }} {...labels} />);
    expect(within(screen.getByRole("article")).getByText("返信者不明")).toBeInTheDocument();
  });

  it("starts history open, preserves toggles on rerender and resets for a different contact", () => {
    const view = render(<ContactDetail contact={contact} {...labels} />);
    const history = screen.getByRole("heading", { level: 4 }).closest("details")!;
    expect(history).toHaveAttribute("open");
    fireEvent.click(history.querySelector("summary")!);
    expect(history).not.toHaveAttribute("open");
    view.rerender(<ContactDetail contact={{ ...contact }} {...labels} />);
    expect(history).not.toHaveAttribute("open");
    view.rerender(<ContactDetail contact={{ ...contact, contactIdentifier: "other", replies: [] }} {...labels} />);
    const otherHistory = screen.getByRole("heading", { level: 4 }).closest("details")!;
    expect(otherHistory).not.toBe(history);
    expect(otherHistory).toHaveAttribute("open");
    expect(screen.getByText(labels.emptyHistory)).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(otherHistory.querySelector(".border-l-2")).toBeNull();
  });
});
