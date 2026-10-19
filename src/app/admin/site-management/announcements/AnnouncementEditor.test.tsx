import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AnnouncementEditor } from "./AnnouncementEditor";
import { dictionaries } from "@/i18n/dictionaries";
afterEach(cleanup);
const id = "019b0000-0000-7000-8000-000000000001";
const draft = {
  announcementIdentifier: id,
  sourceLanguage: "ja" as const,
  category: 1 as const,
  publishedDate: "2026-10-19",
  contents: { ja: { title: "既存", content: "本文" } },
};
it("retains per-language edits, requires save before translation and all languages before publication", () => {
  const run = vi.fn();
  render(
    <AnnouncementEditor
      draft={draft}
      allowed={() => true}
      busy={false}
      onAction={run}
      onClose={vi.fn()}
      t={dictionaries.ja.announcements}
    />,
  );
  expect(screen.getByRole("button", { name: "公開" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("タイトル"), {
    target: { value: "編集中" },
  });
  expect(screen.getByRole("button", { name: "翻訳" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("表示言語"), {
    target: { value: "en" },
  });
  fireEvent.change(screen.getByLabelText("タイトル"), {
    target: { value: "English" },
  });
  fireEvent.change(screen.getByLabelText("表示言語"), {
    target: { value: "ja" },
  });
  expect(screen.getByLabelText("タイトル")).toHaveValue("編集中");
  expect(screen.getByRole("status")).toHaveTextContent(
    "翻訳・公開の前に変更を保存してください。",
  );
});
it("can submit saved-language changes while viewing an untranslated language", () => {
  const run = vi.fn();
  const { container } = render(
    <AnnouncementEditor
      draft={draft}
      allowed={() => true}
      busy={false}
      onAction={run}
      onClose={vi.fn()}
      t={dictionaries.ja.announcements}
    />,
  );
  fireEvent.change(screen.getByLabelText("タイトル"), {
    target: { value: "編集" },
  });
  fireEvent.change(screen.getByLabelText("表示言語"), {
    target: { value: "en" },
  });
  expect(container.querySelector("form")).toHaveAttribute("novalidate");
  fireEvent.submit(container.querySelector("form")!);
  expect(run).toHaveBeenCalledWith("save", [
    expect.objectContaining({ language: "ja", title: "編集" }),
  ]);
});
it("never exposes forbidden actions", () => {
  render(
    <AnnouncementEditor
      draft={draft}
      allowed={() => false}
      busy={false}
      onAction={vi.fn()}
      onClose={vi.fn()}
      t={dictionaries.ja.announcements}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "保存" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "削除" }),
  ).not.toBeInTheDocument();
});
