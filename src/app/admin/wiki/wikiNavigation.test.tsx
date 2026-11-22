import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { WikiPrincipalSummary } from "@/gateways/wiki/wikiPrincipal";
import { dictionaries } from "@/i18n/dictionaries";
import { WikiLayoutClient } from "./WikiLayoutClient";
import { resolveWikiCategory } from "./wikiNavigation";
import type { AdminWikiTab } from "../adminTypes";

afterEach(cleanup);
const t = dictionaries.ja.admin;
const principal: WikiPrincipalSummary = {
  principalIdentifier: "wiki-user", identityIdentifier: "actor", status: "active",
  accountPrincipalCount: 2, isDelegatedPrincipal: false,
  policies: [{ policyIdentifier: "admin", name: "admin", isSystemPolicy: true, statements: [{ effect: "allow", actions: ["*"], resourceTypes: ["*"], condition: null }] }],
};

it.each<{ selected: AdminWikiTab; labels: string[] }>([
  { selected: "editingWikis", labels: [t.editingWikisTab, t.submittedWikisTab, t.unapprovedWikisTab, t.approvedWikisTab, t.untranslatedWikisTab, t.wikiPrincipalGroupManagementTab] },
  { selected: "officialCertificationReview", labels: [t.officialCertificationRequestTab, t.officialCertificationReviewTab] },
  { selected: "managedImages", labels: [t.managedImages.title, t.draftImagesTab, t.imageDeletionRequestsTab] },
  { selected: "watchRequests", labels: [t.playlists.title, t.officialVideoInbox.title] },
])("shows only tabs belonging to the category of $selected", ({ selected, labels }) => {
  render(<WikiLayoutClient canViewOfficialVideoInbox isAuthenticated isPending={false} selectedWikiTab={selected} state={{ status: "available", principal }} t={t} onActivate={vi.fn()} onRetry={vi.fn()} onOpenCreateDraftWiki={vi.fn()}>{(tab) => <output>{tab}</output>}</WikiLayoutClient>);
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(labels);
  expect(screen.getByRole("status")).toHaveTextContent(selected);
  expect(screen.getAllByRole("tab").filter((tab) => tab.getAttribute("aria-selected") === "true")).toHaveLength(1);
});

it.each([
  ["/admin/wiki/official-certification/review", "certification"],
  ["/admin/wiki/watch-requests/detail", "video"],
  ["/admin/wiki/managed-images", "images"],
  ["/admin/wiki/principal-groups", "wiki"],
])("resolves a direct URL %s to %s", (path, category) => {
  expect(resolveWikiCategory(path)).toBe(category);
});
