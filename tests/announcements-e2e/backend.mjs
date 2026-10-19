// Contract fixture, not a live-backend integration test. No private API is exposed.
import { createServer } from "node:http";
const id = "019b0000-0000-7000-8000-000000000001";
const titles = {
  ja: "公開のお知らせ",
  en: "Published announcement",
  ko: "게시된 공지사항",
};
createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  response.setHeader("Content-Type", "application/json");
  if (url.pathname === "/health") return response.end("{}");
  if (request.headers.cookie || url.searchParams.get("language") === null) {
    response.statusCode = 400;
    return response.end("{}");
  }
  const language = url.searchParams.get("language");
  const item = {
    announcement_id: id,
    title: titles[language],
    content: "<script>alert(1)</script>\nSecond line",
    category_name: "NEWS",
    published_date: "2026-10-19",
  };
  if (url.pathname === "/api/v1/site-management/announcements") {
    if (
      url.searchParams.get("sort") !== "published_date" ||
      url.searchParams.get("order") !== "desc"
    ) {
      response.statusCode = 422;
      return response.end("{}");
    }
    const page = Number(url.searchParams.get("page"));
    return response.end(
      JSON.stringify({
        announcements: [
          { ...item, title: page === 2 ? `${item.title} 2` : item.title },
        ],
        current_page: page,
        last_page: 2,
        per_page: 20,
        total: 21,
      }),
    );
  }
  if (url.pathname === `/api/v1/site-management/announcements/${id}`)
    return response.end(JSON.stringify(item));
  response.statusCode = 404;
  response.end("{}");
}).listen(Number(process.env.ANNOUNCEMENT_FIXTURE_PORT), "127.0.0.1");
