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
  contents: { ja: { title: "既存", content: "本文" } },
};
it.each(["ja", "en", "ko"] as const)("creates a draft in the selected app language %s without a source-language selector", (locale) => {
  const run = vi.fn();
  render(
    <AnnouncementEditor
      locale={locale}
      draft={null}
      allowed={() => true}
      busy={false}
      onAction={run}
      onClose={vi.fn()}
      t={dictionaries.ja.announcements}
    />,
  );
  expect(screen.queryByLabelText(dictionaries.ja.announcements.sourceLanguage)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("タイトル"), {
    target: { value: "新しいお知らせ" },
  });
  fireEvent.change(screen.getByLabelText("本文"), {
    target: { value: "本文" },
  });
  fireEvent.click(screen.getByRole("button", { name: "新規作成" }));
  expect(run).toHaveBeenCalledWith("save", [{
    language: locale,
    category: 1,
    title: "新しいお知らせ",
    content: "本文",
  }]);
});
it("retains per-language edits, requires save before translation and all languages before publication", () => {
  const run = vi.fn();
  render(
    <AnnouncementEditor
      locale="ja"
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
});
it("can submit saved-language changes while viewing an untranslated language", () => {
  const run = vi.fn();
  const { container } = render(
    <AnnouncementEditor
      locale="ja"
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
      locale="ja"
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

it("previews the selected language live and submits the original Markdown", () => {
  const run = vi.fn();
  render(
    <AnnouncementEditor
      locale="ja"
      draft={draft}
      allowed={() => true}
      busy={false}
      onAction={run}
      onClose={vi.fn()}
      t={dictionaries.ja.announcements}
    />,
  );
  const markdown = "## 更新情報\n\n**重要**\n\n- お知らせ";
  fireEvent.change(screen.getByLabelText("本文"), { target: { value: markdown } });
  fireEvent.click(screen.getByRole("tab", { name: "プレビュー" }));
  expect(screen.getByRole("heading", { name: "更新情報" })).toBeInTheDocument();
  expect(screen.getByText("重要").tagName).toBe("STRONG");
  fireEvent.keyDown(screen.getByRole("tab", { name: "プレビュー" }), { key: "ArrowLeft" });
  expect(screen.getByRole("tab", { name: "編集" })).toHaveFocus();
  expect(screen.getByLabelText("本文")).toHaveValue(markdown);
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(run).toHaveBeenCalledWith("save", [expect.objectContaining({ language: "ja", content: markdown })]);
  fireEvent.change(screen.getByLabelText("表示言語"), { target: { value: "en" } });
  fireEvent.click(screen.getByRole("tab", { name: "プレビュー" }));
  expect(screen.queryByRole("heading", { name: "更新情報" })).not.toBeInTheDocument();
  expect(screen.getByText("本文を入力するとプレビューが表示されます。")).toBeInTheDocument();
});
