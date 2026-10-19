import Link from "next/link";
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
      <Link className="underline" href={`/${language}/announcements`}>
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
        <article className="space-y-4">
          <h1 className="text-2xl font-bold break-words">{item.title}</h1>
          <p>
            {categories[item.category_name]} ·{" "}
            <time dateTime={item.published_date}>{item.published_date}</time>
          </p>
          <p className="whitespace-pre-wrap break-words">{item.content}</p>
        </article>
      )}
    </main>
  );
}
