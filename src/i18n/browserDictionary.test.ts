import { afterEach, describe, expect, it } from "vitest";
import { getBrowserDictionary } from "./browserDictionary";
import { localeCookieName } from "./locales";

afterEach(() => { document.cookie = `${localeCookieName}=; Path=/; Max-Age=0`; });

describe("getBrowserDictionary", () => {
  it("uses the current UI cookie for requests without an explicit language", () => {
    document.cookie = `${localeCookieName}=ko; Path=/`;
    expect(getBrowserDictionary().common.authenticationFailed).toContain("인증");
    document.cookie = `${localeCookieName}=ja; Path=/`;
    expect(getBrowserDictionary().common.authenticationFailed).toContain("認証");
    expect(getBrowserDictionary("en").common.authenticationFailed).toBe("Authentication failed. Please try again later.");
  });
});
