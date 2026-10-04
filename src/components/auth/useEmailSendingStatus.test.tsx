import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useEmailSendingStatus } from "./useEmailSendingStatus";

describe("useEmailSendingStatus", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("keeps a restored status cleared for the rest of the mount", () => {
    window.sessionStorage.setItem("status", JSON.stringify({
      context: "member@example.com",
      remainingSends: 3,
      retryAt: Date.now() + 60_000,
    }));
    const { result } = renderHook(() => useEmailSendingStatus("status", "member@example.com"));

    expect(result.current.remainingSends).toBe(3);
    act(() => result.current.clear());

    expect(result.current.status).toBeNull();
    expect(result.current.remainingSends).toBeNull();
    expect(window.sessionStorage.getItem("status")).toBeNull();
  });
});
