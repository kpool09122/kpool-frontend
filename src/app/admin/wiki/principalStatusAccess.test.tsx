import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { WikiLayoutClient } from "./WikiLayoutClient";
import type { WikiPrincipalSummary } from "@/gateways/wiki/wikiPrincipal";
afterEach(cleanup);
const t = dictionaries.ja.admin;
describe("stopped Wiki URL access", () => {
  it.each(["suspended", "forced_stop"] as const)(
    "does not render tools or children for %s",
    (status) => {
      const principal: WikiPrincipalSummary = {
        status,
        principalIdentifier: "user",
        identityIdentifier: "actor",
        accountPrincipalCount: 2,
        isDelegatedPrincipal: true,
        policies: [],
      };
      render(
        <WikiLayoutClient
          state={{ status: "available", principal }}
          selectedWikiTab="editingWikis"
          isAuthenticated
          isPending={false}
          t={t}
          onActivate={vi.fn()}
          onRetry={vi.fn()}
          onOpenCreateDraftWiki={vi.fn()}
        >
          {() => <button>private tool</button>}
        </WikiLayoutClient>,
      );
      expect(screen.getByText(t.principalStatus.inactive)).toBeInTheDocument();
      expect(screen.queryByText("private tool")).not.toBeInTheDocument();
      expect(screen.queryByText(t.createWiki)).not.toBeInTheDocument();
    },
  );
});
