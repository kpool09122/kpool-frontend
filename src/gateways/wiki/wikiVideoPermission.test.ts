import { describe, expect, it } from "vitest";
import { canCreateWikiVideo, type WikiPrincipalSummary } from "./wikiPrincipal";
const principal = (
  statements: WikiPrincipalSummary["policies"][number]["statements"],
  status: WikiPrincipalSummary["status"] = "active",
): WikiPrincipalSummary => ({
  principalIdentifier: "p",
  identityIdentifier: "i",
  accountPrincipalCount: 1,
  isDelegatedPrincipal: false,
  status,
  policies: [
    {
      policyIdentifier: "policy",
      name: "collaborator",
      isSystemPolicy: true,
      statements,
    },
  ],
});
const allow = {
  effect: "allow" as const,
  actions: ["save_video_links"],
  resourceTypes: ["group"],
  condition: null,
};
describe("video creation permission mirrors SAVE_VIDEO_LINKS on the Wiki resource", () => {
  it("requires the correct action, resource and active principal", () => {
    expect(canCreateWikiVideo(principal([allow]), "group")).toBe(true);
    expect(canCreateWikiVideo(principal([allow]), "song")).toBe(false);
    expect(
      canCreateWikiVideo(
        principal([{ ...allow, actions: ["create"] }]),
        "group",
      ),
    ).toBe(false);
    expect(canCreateWikiVideo(principal([allow], "suspended"), "group")).toBe(
      false,
    );
    expect(canCreateWikiVideo(principal([allow], "forced_stop"), "group")).toBe(
      false,
    );
  });
  it("honors deny and cannot grant on unknown conditions", () => {
    expect(
      canCreateWikiVideo(
        principal([allow, { ...allow, effect: "deny" }]),
        "group",
      ),
    ).toBe(false);
    const conditional = {
      ...allow,
      condition: {
        clauses: [
          {
            field: "resource:agencyId",
            operator: "eq" as const,
            value: "unknown",
          },
        ],
      },
    };
    expect(canCreateWikiVideo(principal([conditional]), "group")).toBe(false);
    expect(
      canCreateWikiVideo(
        principal([allow, { ...conditional, effect: "deny" }]),
        "group",
      ),
    ).toBe(false);
    expect(
      canCreateWikiVideo(
        principal([{ ...allow, actions: ["*"], resourceTypes: ["*"] }]),
        "agency",
      ),
    ).toBe(true);
  });
});
