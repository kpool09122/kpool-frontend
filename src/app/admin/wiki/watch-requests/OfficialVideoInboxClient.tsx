"use client";
import { usePathname, useRouter } from "next/navigation";
import { WikiVideoPanel } from "@/components/Wiki/WikiVideoPanel";
import { useOfficialVideoWikis } from "@/gateways/wiki/useOfficialVideoWikis";
import {
  officialVideoInboxPath,
  officialVideoInboxErrorStatus,
} from "@/gateways/wiki/officialVideoInbox";
import { useI18n } from "@/i18n/I18nProvider";
import { useWikiSection } from "../WikiSectionProvider";
export function OfficialVideoInboxClient() {
  const { query, scope, enabled, checkingIdentity } = useOfficialVideoWikis();
  const { principalState } = useWikiSection();
  const { dictionary, locale } = useI18n();
  const t = dictionary.admin.officialVideoInbox;
  const pathname = usePathname();
  const router = useRouter();
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
        <>
          <label className="grid gap-2">
            <span className="sr-only">{t.select}</span>
            <select
              className="min-h-11 rounded border border-stroke-subtle bg-surface-base p-2"
              value={selected?.wikiIdentifier ?? ""}
              onChange={(event) =>
                router.push(officialVideoInboxPath(event.target.value))
              }
            >
              {wikis.map((wiki) => (
                <option key={wiki.wikiIdentifier} value={wiki.wikiIdentifier}>
                  {wiki.name} ({wiki.language})
                </option>
              ))}
            </select>
          </label>
          {selected ? (
            <WikiVideoPanel
              key={`${scope}:${selected.wikiIdentifier}`}
              language={selected.language}
              resourceType="talent"
              slug={selected.slug}
              wikiTitle={selected.name}
              officialInboxWikiIdentifier={selected.wikiIdentifier}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
