import { describe, expect, it } from "vitest";

import { getApiErrorBody, getApiErrorMessage, readApiErrorBody } from "./apiError";

describe("backend error messages", () => {
  it.each([
    "サーバーエラーが発生しました。",
    "서버 오류가 발생했습니다.",
    "A server error has occurred.",
  ])("preserves the backend translation: %s", (detail) => {
    const body = {
      status: 500,
      title: "Internal Server Error",
      detail,
      code: "operation_failed",
      errors: { name: [detail] },
    };

    expect(getApiErrorBody(body, "Fallback")).toEqual({ ...body, message: detail });
  });

  it("prefers the localized Problem Details explanation over a generic message", () => {
    expect(getApiErrorMessage({ detail: "入力内容を確認してください。", message: "Validation failed" }, "Fallback"))
      .toBe("入力内容を確認してください。");
  });

  it.each([
    [{ message: "既に申請されています。" }, "既に申請されています。"],
    [{ detail: "", message: "Retry later" }, "Retry later"],
    [{ title: "Service Unavailable" }, "Service Unavailable"],
    [null, "Fallback"],
    ["<html>Bad Gateway</html>", "Fallback"],
    [{ detail: "  " }, "Fallback"],
  ])("uses available message fields or falls back for %j", (body, expected) => {
    expect(getApiErrorMessage(body, "Fallback")).toBe(expected);
  });

  it("allows a fallback for non-JSON backend errors", async () => {
    await expect(readApiErrorBody(new Response("Bad Gateway", { status: 502 }))).resolves.toBeNull();
  });
});
