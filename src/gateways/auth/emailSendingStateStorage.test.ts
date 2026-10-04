import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearSessionStorageValue,
  readEmailSendingStatusStorage,
  writeEmailSendingStatusStorage,
  writeRecoveryEmail,
  writeSignupProgress,
} from "./emailSendingStateStorage";

describe("emailSendingStateStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("continues when invalid stored data cannot be removed", () => {
    window.sessionStorage.setItem("status", "invalid-json");
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage is unavailable");
    });

    expect(() => readEmailSendingStatusStorage("status", "context")).not.toThrow();
    expect(readEmailSendingStatusStorage("status", "context")).toBeNull();
  });

  it("continues when stored data cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage is unavailable");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage is unavailable");
    });

    expect(() => readEmailSendingStatusStorage("status", "context")).not.toThrow();
    expect(readEmailSendingStatusStorage("status", "context")).toBeNull();
  });

  it("does not propagate storage write or removal failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage quota exceeded");
    });
    expect(() => writeEmailSendingStatusStorage("status", {
      context: "context",
      remainingSends: 4,
      retryAt: null,
    })).not.toThrow();
    expect(() => writeRecoveryEmail("progress", "member@example.com")).not.toThrow();
    expect(() => writeSignupProgress("signup", {
      email: "member@example.com",
      accountName: "member",
      language: "ja",
      passkeyDisplayName: "passkey",
      base64EncodedImage: "",
    })).not.toThrow();

    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage is unavailable");
    });
    expect(() => clearSessionStorageValue("status")).not.toThrow();
  });
});
