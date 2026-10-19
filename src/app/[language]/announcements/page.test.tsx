import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AnnouncementList from "./page";
import AnnouncementDetail from "./[announcementIdentifier]/page";
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/gateways/site-management/publicAnnouncements", () => ({
  loadPublicAnnouncements: mocks.load,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("shows empty, unavailable and invalid-locale states", async () => {
  mocks.load.mockResolvedValueOnce({
    ok: true,
    list: {
      announcements: [],
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 20,
    },
  });
  const props = {
    params: Promise.resolve({ language: "ko" }),
    searchParams: Promise.resolve({ page: "-1" }),
  };
  const { unmount } = render(await AnnouncementList(props));
  expect(screen.getByText("공지사항이 없습니다.")).toBeInTheDocument();
  unmount();
  mocks.load.mockResolvedValueOnce({ ok: false, status: 503 });
  render(await AnnouncementList(props));
  expect(screen.getByRole("alert")).toHaveTextContent("실패");
  expect(screen.getByRole("link", { name: "다시 시도" })).toBeInTheDocument();
  await expect(
    AnnouncementList({ ...props, params: Promise.resolve({ language: "zh" }) }),
  ).rejects.toThrow("NOT_FOUND");
});
it("renders public localized list and next page without auth and preserves API ordering", async () => {
  mocks.load.mockResolvedValue({
    ok: true,
    list: {
      announcements: [
        {
          announcement_id: "019b0000-0000-7000-8000-000000000001",
          category_name: "NEWS",
          published_date: "2026-10-19",
          title: "公開タイトル",
          content: "本文",
        },
      ],
      current_page: 1,
      last_page: 2,
      total: 21,
      per_page: 20,
    },
  });
  render(
    await AnnouncementList({
      params: Promise.resolve({ language: "ja" }),
      searchParams: Promise.resolve({ page: "1" }),
    }),
  );
  expect(screen.getByRole("link", { name: "公開タイトル" })).toHaveAttribute(
    "href",
    "/ja/announcements/019b0000-0000-7000-8000-000000000001",
  );
  expect(screen.getByRole("link", { name: "次へ" })).toHaveAttribute(
    "href",
    "/ja/announcements?page=2",
  );
  expect(mocks.load).toHaveBeenCalledWith("ja", 1);
});
it("renders Markdown without executing HTML and resolves missing details to 404", async () => {
  const params = Promise.resolve({
    language: "en",
    announcementIdentifier: "019b0000-0000-7000-8000-000000000001",
  });
  mocks.load.mockResolvedValueOnce({
    ok: true,
    detail: {
      title: "Notice",
      content: "<script>evil()</script>\nNext line\n\n## お知らせの本文\n\n**重要**",
      category_name: "NEWS",
      published_date: "2026-10-19",
    },
  });
  const { container } = render(await AnnouncementDetail({ params }));
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getByText(/evil/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "お知らせの本文" })).toBeInTheDocument();
  expect(container.querySelector("strong")).toHaveTextContent("重要");
  mocks.load.mockResolvedValueOnce({ ok: false, status: 404 });
  await expect(AnnouncementDetail({ params })).rejects.toThrow("NOT_FOUND");
});
