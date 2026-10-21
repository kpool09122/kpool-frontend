import { isSafeMaterialSearchUrl } from "@kpool/wiki";
import type {
  WikiImageLibraryDictionary,
  WikiMaterialSearchController,
} from "./types";

export function WikiMaterialSearchPanel({
  controller,
  t,
  onUseSource,
}: {
  controller: WikiMaterialSearchController;
  t: WikiImageLibraryDictionary;
  onUseSource: (siteName: string, pageUrl: string) => void;
}) {
  const words = t.materialSearch;
  return (
    <section
      aria-labelledby="wiki-image-library-search-tab"
      id="wiki-image-library-search-panel"
      role="tabpanel"
      className="grid gap-5"
    >
      <div className="flex items-start gap-4">
        <p className="min-w-0 flex-1">{words.notice}</p>
        <button
          type="button"
          disabled={controller.isSearching}
          onClick={() => controller.onSearch()}
          className="shrink-0 whitespace-nowrap rounded-full border border-brand-primary bg-brand-primary px-5 py-3 text-sm font-semibold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {controller.isSearching ? words.searching : words.search}
        </button>
      </div>
      {controller.error ? <p role="alert">{controller.error}</p> : null}
      <div aria-live="polite" aria-busy={controller.isSearching}>
        {controller.isSearching ? (
          <p role="status">{words.searching}</p>
        ) : null}
        {controller.result ? (
          <div className="grid gap-4">
            {controller.result.sites.length === 0 ? (
              <p>{words.empty}</p>
            ) : (
              controller.result.sites.map((site) => (
                <article
                  key={site.pageUrl}
                  className="grid gap-3 break-words rounded-xl border border-stroke-subtle p-4"
                >
                  <h3 className="font-semibold">{site.siteName}</h3>
                  {isSafeMaterialSearchUrl(site.pageUrl) ? (
                    <a
                      href={site.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all underline"
                    >
                      {site.pageUrl}
                    </a>
                  ) : null}
                  <p>{site.reason}</p>
                  <h4 className="font-semibold">{words.evidence}</h4>
                  <p>{site.usageEvidence}</p>
                  {isSafeMaterialSearchUrl(site.usageEvidenceUrl) ? (
                    <a
                      href={site.usageEvidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all underline"
                    >
                      {site.usageEvidenceUrl}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    disabled={!isSafeMaterialSearchUrl(site.pageUrl)}
                    onClick={() => onUseSource(site.siteName, site.pageUrl)}
                    className="rounded-xl border border-stroke-subtle px-4 py-2"
                  >
                    {words.useSource}
                  </button>
                </article>
              ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
