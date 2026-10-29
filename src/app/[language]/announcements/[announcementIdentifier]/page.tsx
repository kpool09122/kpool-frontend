import { LocalizedDateTime } from "@/components/LocalizedDateTime";
import Link from "next/link";
import { AnnouncementCategoryBadge } from "@/components/Announcement/AnnouncementCategoryBadge";
import { AnnouncementMarkdown } from "@/components/Announcement/AnnouncementMarkdown";
import { notFound } from "next/navigation";
import { isSupportedLocale } from "@/i18n/locales";
import { dictionaries } from "@/i18n/dictionaries";
import { announcementIdentifierSchema } from "@/gateways/site-management/announcements";
import { loadPublicAnnouncements } from "@/gateways/site-management/publicAnnouncements";
export const dynamic = "force-dynamic";
export default async function AnnouncementDetail({
  params,
}: {
  params: Promise<{ language: string; announcementIdentifier: string }>;
}) {
  const { language, announcementIdentifier: id } = await params;
  if (
    !isSupportedLocale(language) ||
    !announcementIdentifierSchema.safeParse(id).success
  )
    notFound();
  const t = dictionaries[language].announcements;
  const result = await loadPublicAnnouncements(language, 1, id);
  if (!result.ok && result.status === 404) notFound();
  const item = result.ok ? result.detail : undefined;
  const categories = {
    NEWS: t.news,
    UPDATES: t.updates,
    MAINTENANCE: t.maintenance,
  };
  return (
    <main className="mx-auto w-[90%] max-w-4xl space-y-6 py-8 text-text-strong">
      <Link className="block w-fit underline" href={`/${language}/announcements`}>
        {t.title}
      </Link>
      {!item ? (
        <div role="alert">
          {t.failed}
          <Link
            className="ml-4 underline"
            href={`/${language}/announcements/${id}`}
          >
            {t.retry}
          </Link>
        </div>
      ) : (
        <article className="space-y-6">
          <h1 className="text-2xl font-bold break-words">{item.title}</h1>
          <p className="flex flex-wrap items-center gap-3">
            <AnnouncementCategoryBadge
              label={categories[item.category_name]}
            />
            <LocalizedDateTime className="text-sm text-text-muted" value={item.published_date} locale={language} dateOnly />
          </p>
          <AnnouncementMarkdown content={item.content} />
        </article>
      )}
    </main>
  );
}
