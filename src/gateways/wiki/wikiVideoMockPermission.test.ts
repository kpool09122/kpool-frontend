import { afterEach, expect, it, vi } from "vitest";
import { getMockWikiPrincipalState } from "./mockWikiGateway";
import { canCreateWikiVideo } from "./wikiPrincipal";
afterEach(() => vi.unstubAllEnvs());
it("provides the real video action in the collaborator E2E principal", () => {
  vi.stubEnv("KPOOL_ENABLE_MOCK_WIKI_GATEWAY", "1");
  const state = getMockWikiPrincipalState(
    "kpool-e2e-wiki-principal=video-collaborator",
  );
  expect(state?.status).toBe("available");
  expect(
    state?.status === "available" &&
      canCreateWikiVideo(state.principal, "group"),
  ).toBe(true);
});
