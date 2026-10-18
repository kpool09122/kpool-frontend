import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "./route";

describe("category change request error forwarding", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it.each([
    ["ja", "プロフィールで電話番号と住所の必須項目を入力・保存してから、もう一度申請してください。"],
    ["en", "Enter and save your phone number and all required address fields in Profile, then try again."],
    ["ko", "프로필에서 전화번호와 주소의 필수 항목을 입력하고 저장한 뒤 다시 신청해 주세요."],
  ])("forwards language %s and returns the upstream localized detail", async (locale, message) => {
    vi.stubEnv("KPOOL_ACCOUNT_API_BASE_URL", "https://account.example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: message }), { status: 422 }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://app.example.test/api/account/accounts/account-1/category-change-requests", {
      method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": locale, cookie: "session=abc" }, body: JSON.stringify({ requestedAccountCategory: "agency" }),
    }) as NextRequest;
    const response = await POST(request, { params: Promise.resolve({ accountId: "account-1" }) });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ detail: message, message });
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: expect.objectContaining({ "Accept-Language": locale, Cookie: "session=abc" }) }));
  });
});
