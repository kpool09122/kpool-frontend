import { useI18n } from "@/i18n/I18nProvider";
import {
  isWikiResourceType,
  isSafeMaterialSearchUrl,
  type WikiMaterialSearchContext,
} from "@kpool/wiki";
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
  const { dictionary } = useI18n();
  const resourceLabel = (value: string) =>
    isWikiResourceType(value) ? dictionary.home.resourceLabels[value] : value;
  const relationLabels: Record<string, string> = {
    agency: dictionary.wiki.basicFieldLabels.agency,
    groups: dictionary.wiki.basicFieldLabels.groups,
    talents: dictionary.wiki.basicFieldLabels.talents,
  };
  const describe = (context: WikiMaterialSearchContext) => (
    <>
      <p className="break-words font-semibold">
        {context.title || context.displayName || words.titleRequired}
      </p>
      <p>
        {resourceLabel(context.resourceType)} · {context.language}
      </p>
      <ul className="list-inside list-disc">
        {context.relatedWikis.map((wiki) => (
          <li key={`${wiki.relationType}:${wiki.identifier}`}>
            {wiki.title || wiki.identifier} · {resourceLabel(wiki.resourceType)}{" "}
            · {relationLabels[wiki.relationType ?? ""] ?? wiki.relationType}
          </li>
        ))}
      </ul>
      {context.relatedWikis.length === 0 ? <p>{words.noRelations}</p> : null}
    </>
  );
  return (
    <section
      aria-labelledby="wiki-image-library-search-tab"
      id="wiki-image-library-search-panel"
      role="tabpanel"
      className="grid gap-5"
    >
      <p>{words.notice}</p>
      <div
        aria-label={words.context}
        className="rounded-xl border border-stroke-subtle p-4"
      >
        {describe(controller.context)}
      </div>
      <button
        type="button"
        disabled={controller.isSearching}
        onClick={() => controller.onSearch()}
        className="rounded-xl border border-stroke-subtle px-4 py-3 font-semibold disabled:opacity-50"
      >
        {controller.isSearching ? words.searching : words.search}
      </button>
      {controller.error ? <p role="alert">{controller.error}</p> : null}
      <div aria-live="polite" aria-busy={controller.isSearching}>
        {controller.isSearching ? (
          <p role="status">{words.searching}</p>
        ) : !controller.result && !controller.error ? (
          <p>{words.idle}</p>
        ) : null}
        {controller.result ? (
          <div className="grid gap-4">
            <div aria-label={words.previousContext}>
              {describe(controller.result.context)}
            </div>
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
