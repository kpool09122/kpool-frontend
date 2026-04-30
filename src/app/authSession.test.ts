import { describe, expect, it } from "vitest";

import {
  clearAuthenticated,
  markAuthenticated,
} from "./authSession";

describe("auth session helpers", () => {
  it("marks and clears the browser auth state", () => {
    clearAuthenticated();

    markAuthenticated();
    expect(window.localStorage.getItem("kpool.authenticated")).toBe("true");

    clearAuthenticated();
    expect(window.localStorage.getItem("kpool.authenticated")).toBeNull();
  });
});
