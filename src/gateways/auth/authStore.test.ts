import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentAuthenticatedIdentity } from "@/gateways/identity/authIdentityBrowserApi";
import { useAuthStore } from "./authStore";
vi.mock("@/gateways/identity/authIdentityBrowserApi", () => ({ fetchCurrentAuthenticatedIdentity: vi.fn() }));
const identity = { identityIdentifier: "identity-1", identityName: "member", email: "member@example.com", language: "ja", accountIdentifier: "original" };

describe("auth session boundaries", () => {
  beforeEach(() => { useAuthStore.setState(useAuthStore.getInitialState(), true); vi.clearAllMocks(); });
  afterEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));
  it("clears identity and changes the session version when logging out", () => {
    useAuthStore.getState().setIdentity(identity);
    const previousVersion = useAuthStore.getState().sessionVersion;
    useAuthStore.getState().clearIdentity();
    expect(useAuthStore.getState().identity).toBeNull();
    expect(useAuthStore.getState().status).toBe("guest");
    expect(useAuthStore.getState().sessionVersion).toBe(previousVersion + 1);
  });
  it("ignores a previous session's identity response after logout and relogin", async () => {
    let resolve!: (value: typeof identity) => void;
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    useAuthStore.getState().setIdentity({ ...identity, accountIdentifier: "delegated" });
    const oldRefresh = useAuthStore.getState().refreshIdentity();
    useAuthStore.getState().clearIdentity();
    useAuthStore.getState().setIdentity(identity);
    resolve({ ...identity, accountIdentifier: "delegated" });
    await expect(oldRefresh).resolves.toBeNull();
    expect(useAuthStore.getState().identity).toEqual(identity);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });
  it.each(["accountIdentifier", "identityIdentifier"] as const)("ignores stale auth refresh after %s changes in the same session", async (key) => {
    let resolve!: (value: typeof identity) => void;
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    useAuthStore.getState().setIdentity(identity);
    const refresh = useAuthStore.getState().refreshIdentity({ preserveOnNull: true });
    const switched = { ...identity, [key]: "new" };
    useAuthStore.getState().setIdentity(switched);
    resolve(identity);
    await expect(refresh).resolves.toBeNull();
    expect(useAuthStore.getState().identity).toEqual(switched);
  });
  it("does not change the session version for a failed identity refresh before login", async () => {
    vi.mocked(fetchCurrentAuthenticatedIdentity).mockResolvedValue(null);
    await useAuthStore.getState().refreshIdentity();
    expect(useAuthStore.getState().sessionVersion).toBe(0);
    expect(useAuthStore.getState().status).toBe("guest");
  });

});
