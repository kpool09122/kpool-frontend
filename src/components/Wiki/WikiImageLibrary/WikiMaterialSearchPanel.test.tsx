import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { dictionaries } from "@/i18n/dictionaries";
import { WikiMaterialSearchPanel } from "./WikiMaterialSearchPanel";
const context = {
  title: "Edited Wiki",
  resourceType: "group" as const,
  language: "ko" as const,
  relatedWikis: [
    {
      identifier: "id",
      title: "Agency",
      resourceType: "agency" as const,
      relationType: "agency",
    },
  ],
};
const site = {
  siteName: "Commons",
  pageUrl: "https://commons.wikimedia.org/wiki/File:A",
  reason: "Target",
  usageEvidence: "CC",
  usageEvidenceUrl: "https://commons.wikimedia.org/wiki/License",
};
afterEach(cleanup);
describe("material search panel", () => {
  it.each(["ja", "en", "ko"] as const)(
    "localizes context labels and states in %s",
    (locale) => {
      const t = dictionaries[locale].wiki.imageLibrary;
      render(
        <I18nProvider initialLocale={locale}>
          <WikiMaterialSearchPanel
            t={t}
            onUseSource={() => {}}
            controller={{
              context,
              result: null,
              isSearching: false,
              error: null,
              onSearch: () => {},
            }}
          />
        </I18nProvider>,
      );
      expect(screen.getByText(t.materialSearch.idle)).toBeInTheDocument();
      expect(
        screen.getByText(
          `${dictionaries[locale].home.resourceLabels.group} · ko`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          new RegExp(dictionaries[locale].home.resourceLabels.agency),
        ),
      ).toBeInTheDocument();
    },
  );
  it("renders up to three sites with citations and passes siteName/pageUrl only to the upload flow", () => {
    const sites = [
      site,
      {
        ...site,
        siteName: "Pexels",
        pageUrl: "https://pexels.com/photo/example",
      },
      {
        ...site,
        siteName: "Unsplash",
        pageUrl: "https://unsplash.com/photos/example",
      },
    ];
    const onUseSource = vi.fn();
    const t = dictionaries.en.wiki.imageLibrary;
    render(
      <I18nProvider initialLocale="en">
        <WikiMaterialSearchPanel
          t={t}
          onUseSource={onUseSource}
          controller={{
            context,
            result: { context, sites },
            isSearching: false,
            error: null,
            onSearch: () => {},
          }}
        />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    fireEvent.click(
      screen.getAllByRole("button", { name: t.materialSearch.useSource })[0],
    );
    expect(onUseSource).toHaveBeenCalledWith(site.siteName, site.pageUrl);
  });
  it("does not render active or credentialed URLs as links even if adapter validation is bypassed", () => {
    const t = dictionaries.en.wiki.imageLibrary;
    render(
      <I18nProvider initialLocale="en">
        <WikiMaterialSearchPanel
          t={t}
          onUseSource={() => {}}
          controller={{
            context,
            result: {
              context,
              sites: [
                {
                  ...site,
                  pageUrl: "javascript:alert(1)",
                  usageEvidenceUrl: "https://user:password@evil.test",
                },
              ],
            },
            isSearching: false,
            error: null,
            onSearch: () => {},
          }}
        />
      </I18nProvider>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: t.materialSearch.useSource }),
    ).toBeDisabled();
  });
});
