import { describe, expect, it } from "vitest";
import { buildMarkdownDescription } from "./metadataDescription";

describe("Markdown metadata description", () => {
  it("keeps prose, inline code and link labels with decoded entities", () => {
    expect(buildMarkdownDescription(
      '# お知らせ\n\n**新機能**と[利用方法](https://example.com/docs)を公開しました。\n`設定`から A &amp; B を選べます。\n\n- 詳細は[こちら][guide]\n\n[guide]: https://example.com/guide',
    )).toBe("お知らせ 新機能と利用方法を公開しました。 設定から A & B を選べます。 詳細はこちら");
  });

  it("omits images, raw HTML blocks and fenced code", () => {
    expect(buildMarkdownDescription(
      '![画像の代替文](https://example.com/image.png)\n\n<script>hidden()</script>\n\n```js\nconst hidden = true;\n```\n\n公開本文です。',
    )).toBe("公開本文です。");
  });

  it("keeps nested formatting and separates adjacent blocks", () => {
    expect(buildMarkdownDescription('> **重要な[お知らせ](https://example.com)**\n\n次の段落。\n\n---\n\n最後の段落。'))
      .toBe("重要なお知らせ 次の段落。 最後の段落。");
  });

  it("limits generated descriptions without splitting surrogate pairs", () => {
    const description = buildMarkdownDescription("😀".repeat(161));
    expect(Array.from(description)).toHaveLength(160);
    expect(description).toBe(`${"😀".repeat(159)}…`);
    expect(buildMarkdownDescription("あ".repeat(160))).toBe("あ".repeat(160));
  });

  it.each(["", " \n\t", "![image](https://example.com/image.png)"])("returns empty when there is no prose: %s", (content) => {
    expect(buildMarkdownDescription(content)).toBe("");
  });
});
