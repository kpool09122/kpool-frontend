"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WikiVideoPanel } from "@/components/Wiki/WikiVideoPanel";
import { useOfficialVideoWikis } from "@/gateways/wiki/useOfficialVideoWikis";
import {
  officialVideoInboxPath,
  officialVideoInboxErrorStatus,
  type OfficialVideoWiki,
} from "@/gateways/wiki/officialVideoInbox";
import { useI18n } from "@/i18n/I18nProvider";
import { useWikiSection } from "../WikiSectionProvider";
export function OfficialVideoInboxClient() {
  const { query, scope, enabled, checkingIdentity } = useOfficialVideoWikis();
  const { principalState } = useWikiSection();
  const { dictionary, locale } = useI18n();
  const t = dictionary.admin.officialVideoInbox;
  const pathname = usePathname();
  const requested = pathname?.split("/")[4];
  if (
    principalState.status !== "available" ||
    principalState.principal.status !== "active"
  )
    return null;
  const wikis = query.data?.wikis ?? [];
  const selected = requested
    ? wikis.find((wiki) => wiki.wikiIdentifier === requested)
    : (wikis.find((wiki) => wiki.language === locale) ?? wikis[0]);
  const denied =
    (!enabled && !checkingIdentity) ||
    [401, 403].includes(Number(officialVideoInboxErrorStatus(query.error))) ||
    (query.isSuccess && !!requested && !selected);
  return (
    <section className="space-y-5 rounded-xl border border-stroke-subtle bg-surface-raised p-5">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      {denied ? (
        <p role="alert">{t.forbidden}</p>
      ) : checkingIdentity || query.isPending ? (
        <p role="status">{dictionary.wiki.videos.loading}</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{dictionary.wiki.videos.error}</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="min-h-11 underline"
          >
            {dictionary.wiki.videos.retry}
          </button>
        </div>
      ) : !wikis.length ? (
        <p>{t.empty}</p>
      ) : (
        selected ? <OfficialVideoInboxContent
          key={`${scope}:${selected.wikiIdentifier}`}
          wikis={wikis}
          selected={selected}
        /> : null
      )}
    </section>
  );
}

function OfficialVideoInboxContent({ wikis, selected }: {
  wikis: OfficialVideoWiki[];
  selected: OfficialVideoWiki;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.admin.officialVideoInbox;
  const router = useRouter();
  const [unwatchedOnly, setUnwatchedOnly] = useState(true);
  return <>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label className="min-w-0 flex-[1_1_12rem]">
        <span className="sr-only">{t.select}</span>
        <select
          className="min-h-11 w-full rounded border border-stroke-subtle bg-surface-base p-2"
          value={selected.wikiIdentifier}
          onChange={(event) => router.push(officialVideoInboxPath(event.target.value))}
        >
          {wikis.map((wiki) => (
            <option key={wiki.wikiIdentifier} value={wiki.wikiIdentifier}>
              {wiki.name} ({wiki.language})
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm">
        <input type="checkbox" checked={unwatchedOnly} onChange={(event) => setUnwatchedOnly(event.target.checked)} />
        {t.unwatchedOnly}
      </label>
    </div>
    <WikiVideoPanel
      language={selected.language}
      resourceType="talent"
      slug={selected.slug}
      wikiTitle={selected.name}
      officialInboxWikiIdentifier={selected.wikiIdentifier}
      officialInboxUnwatchedOnly={unwatchedOnly}
    />
  </>;
}
