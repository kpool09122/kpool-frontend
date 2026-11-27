import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ExternalConnectionVerification } from "./ExternalConnectionVerification";

const mocks = vi.hoisted(() => ({
  refreshIdentity: vi.fn(),
  perform: vi.fn(),
}));
const state = { identity: { authenticationMethods: { passkeyCount: 1, linkedSocialProviders: ["google"] } }, refreshIdentity: mocks.refreshIdentity };
vi.mock("@/gateways/auth/authStore", () => ({ useAuthStore: (selector: (value: typeof state) => unknown) => selector(state) }));
vi.mock("@/gateways/auth/recentAuthentication", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/gateways/auth/recentAuthentication")>(), performRecentAuthentication: mocks.perform,
}));
vi.mock("./RecentAuthenticationDialog", () => ({ RecentAuthenticationDialog: ({ onSelect, onClose }: { onSelect: (method: string) => void; onClose: () => void }) => <div role="dialog"><button onClick={() => onSelect("passkey")}>Passkey</button><button onClick={() => onSelect("google")}>Google</button><button onClick={onClose}>Cancel</button></div> }));
beforeEach(() => {
  mocks.refreshIdentity.mockReset().mockResolvedValue(state.identity);
  mocks.perform.mockReset().mockResolvedValue({ status: "verified" });
});
afterEach(cleanup);
it("verifies with a passkey and resumes only the read callback", async () => {
  const onVerified = vi.fn();
  render(<ExternalConnectionVerification returnTo="external-connections" onVerified={onVerified} />);
  fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
  fireEvent.click(await screen.findByRole("button", { name: "Passkey" }));
  await waitFor(() => expect(onVerified).toHaveBeenCalledOnce());
  expect(mocks.perform).toHaveBeenCalledWith(expect.objectContaining({ method: "passkey", returnTo: "external-connections" }));
});
it("preserves the consent context before navigating to SSO", async () => {
  mocks.perform.mockResolvedValue({ status: "redirect", url: "https://accounts.example/reauth" });
  const beforeRedirect = vi.fn();
  const navigate = vi.fn(() => expect(beforeRedirect).toHaveBeenCalledOnce());
  const onVerified = vi.fn();
  render(<ExternalConnectionVerification returnTo="authorization" onVerified={onVerified} beforeRedirect={beforeRedirect} navigate={navigate} />);
  fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
  fireEvent.click(await screen.findByRole("button", { name: "Google" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://accounts.example/reauth"));
  expect(mocks.perform).toHaveBeenCalledWith(expect.objectContaining({ method: "google", returnTo: "authorization" }));
  expect(onVerified).not.toHaveBeenCalled();
});
it("keeps the operation blocked after cancelling authentication", async () => {
  mocks.perform.mockResolvedValue({ status: "error", kind: "cancelled" });
  const onVerified = vi.fn();
  render(<ExternalConnectionVerification returnTo="external-connections" onVerified={onVerified} />);
  fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
  fireEvent.click(await screen.findByRole("button", { name: "Passkey" }));
  await screen.findByRole("alert");
  expect(onVerified).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "本人確認を行う" })).toBeEnabled();
});
it("offers login when the browser session has expired", async () => {
  mocks.refreshIdentity.mockResolvedValue(null);
  render(<ExternalConnectionVerification returnTo="external-connections" onVerified={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
  await screen.findByRole("link", { name: "ログイン" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(mocks.perform).not.toHaveBeenCalled();
});

it("does not leave for SSO if the caller cannot preserve a safe return operation", async () => {
 mocks.perform.mockResolvedValue({ status: "redirect", url: "https://accounts.example/reauth" });
 const navigate = vi.fn();
 render(<ExternalConnectionVerification returnTo="external-connections" onVerified={vi.fn()} beforeRedirect={() => false} navigate={navigate} verificationMessage="Verify card operation" />);
 expect(screen.getByText("Verify card operation")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button", { name: "本人確認を行う" }));
 fireEvent.click(await screen.findByRole("button", { name: "Google" }));
 await screen.findByRole("alert"); expect(navigate).not.toHaveBeenCalled();
});
