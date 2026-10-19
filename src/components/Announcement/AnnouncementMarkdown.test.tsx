import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AnnouncementMarkdown } from "./AnnouncementMarkdown";

afterEach(cleanup);

it("renders headings, inline formatting, lists, links, quotes and code", () => {
  const { container } = render(
    <AnnouncementMarkdown content={'# 見出し\n\n**重要**と*強調*\n\n- 項目1\n- 項目2\n\n1. 手順\n\n[案内](https://example.com)\n\n> 引用\n\n`code`\n\n```js\nconst value = 1;\n```'} />,
  );
  expect(screen.getByRole("heading", { level: 2, name: "見出し" })).toBeInTheDocument();
  expect(container.querySelector("strong")).toHaveTextContent("重要");
  expect(container.querySelector("em")).toHaveTextContent("強調");
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByRole("link", { name: "案内" })).toHaveAttribute("href", "https://example.com");
  expect(container.querySelector("blockquote")).toHaveTextContent("引用");
  expect(container.querySelector("pre code")).toHaveTextContent("const value = 1;");
});

it("keeps raw HTML inert and filters unsafe link protocols", () => {
  const { container } = render(
    <AnnouncementMarkdown content={'<script>alert(1)</script>\n\n[unsafe](javascript:alert%281%29)\n\n<img src=x onerror=alert(1)>\n\n![image](https://example.com/image.png)'} />,
  );
  expect(container.querySelector("script, img, iframe")).toBeNull();
  expect(container).toHaveTextContent("<script>alert(1)</script>");
  expect(container.querySelector("a")).not.toHaveAttribute("href", expect.stringMatching(/^javascript:/));
});
