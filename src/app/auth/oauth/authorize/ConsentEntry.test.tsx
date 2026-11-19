import { StrictMode } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConsentEntry } from "./ConsentEntry";
const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), useSearchParams: () => new URLSearchParams("stepUp=complete") }));
vi.mock("./OAuthConsentPage", () => ({ OAuthConsentPage: () => <p>Consent</p> }));
afterEach(() => { cleanup(); sessionStorage.clear(); mocks.replace.mockClear(); });
it("restores OAuth parameters once under StrictMode without changing opaque state or PKCE", async () => {
  const query = new URLSearchParams({ client_id: "client", state: "opaque + &=雪", code_challenge: "pkce+opaque/=" }).toString();
  sessionStorage.setItem("oauth-step-up-query", query);
  render(<StrictMode><ConsentEntry /></StrictMode>);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(`/auth/oauth/authorize?${query}`));
  expect(sessionStorage.getItem("oauth-step-up-query")).toBeNull();
});
it("stays on the local consent page if no saved query exists", async () => {
  render(<ConsentEntry />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/auth/oauth/authorize"));
});
