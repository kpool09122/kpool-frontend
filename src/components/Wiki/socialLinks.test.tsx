import { describe, expect, it } from "vitest";
import { getSocialLinkInfo } from "./socialLinks";

describe("getSocialLinkInfo", () => {
  it.each([
    ["https://www.instagram.com/example", "Instagram"],
    ["https://m.facebook.com/example", "Facebook"],
    ["https://fb.watch/example", "Facebook"],
    ["https://www.youtube.com/@example", "YouTube"],
    ["https://youtu.be/example", "YouTube"],
    ["https://vm.tiktok.com/example", "TikTok"],
    ["https://x.com/example", "X"],
    ["https://twitter.com/example", "X"],
    ["https://example.com/profile", "example.com"],
    ["https://instagram.com.example.com/profile", "instagram.com.example.com"],
    ["https://fakeinstagram.com/profile", "fakeinstagram.com"],
    ["https://instagram.com@evil.example/profile", "evil.example"],
  ])("identifies %s as %s", (url, label) => {
    expect(getSocialLinkInfo(url)?.label).toBe(label);
  });

  it.each(["javascript:alert(1)", "data:text/html,test", "ftp://instagram.com/test", "invalid", ""])(
    "does not link unsafe or invalid URL %s", (url) => {
      expect(getSocialLinkInfo(url)).toBeNull();
    },
  );
});
