"use client";
import Link from "next/link";
import { useOfficialVideoWikis } from "@/gateways/wiki/useOfficialVideoWikis";
import { officialVideoInboxPath } from "@/gateways/wiki/officialVideoInbox";
import type { WikiVideoIdentity } from "@/gateways/wiki/wikiVideos";
import { useI18n } from "@/i18n/I18nProvider";
export function OfficialVideoInboxEntry({
  identity,
}: {
  identity: WikiVideoIdentity;
}) {
  const { query, enabled } = useOfficialVideoWikis();
  const { dictionary } = useI18n();
  const wiki =
    enabled && !query.isFetching
      ? query.data?.wikis.find(
          (wiki) =>
            wiki.resourceType === identity.resourceType &&
            wiki.language === identity.language &&
            wiki.slug === identity.slug,
        )
      : undefined;
  return wiki ? (
    <Link
      className="inline-block min-h-11 py-3 underline"
      href={officialVideoInboxPath(wiki.wikiIdentifier)}
    >
      {dictionary.admin.officialVideoInbox.open}
    </Link>
  ) : null;
}
