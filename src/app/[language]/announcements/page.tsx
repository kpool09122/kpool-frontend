import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupportedLocale } from "@/i18n/locales";
import { dictionaries } from "@/i18n/dictionaries";
import { loadPublicAnnouncements } from "@/gateways/site-management/publicAnnouncements";
export const dynamic = "force-dynamic";
export default async function AnnouncementList({
  params,
  searchParams,
}: {
  params: Promise<{ language: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { language } = await params;
  if (!isSupportedLocale(language)) notFound();
  const { page: rawPage } = await searchParams;
  const page =
    typeof rawPage === "string" && /^[1-9]\d{0,6}$/.test(rawPage)
      ? Number(rawPage)
      : 1;
  const t = dictionaries[language].announcements;
  const result = await loadPublicAnnouncements(language, page);
  const list = result.ok ? result.list : undefined;
  const categories = {
    NEWS: t.news,
    UPDATES: t.updates,
    MAINTENANCE: t.maintenance,
  };
  return (
    <main className="mx-auto w-[90%] max-w-4xl space-y-6 py-8 text-text-strong">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      {!list ? (
        <div role="alert">
          {t.failed}
          <Link
            className="ml-4 underline"
            href={`/${language}/announcements?page=${page}`}
          >
            {t.retry}
          </Link>
        </div>
      ) : (
        <>
          {list.announcements.length === 0 ? (
            <p>{t.empty}</p>
          ) : (
            <ul className="divide-y divide-stroke-subtle">
              {list.announcements.map((item) => (
                <li key={item.announcement_id} className="space-y-2 py-4">
                  <Link
                    className="text-lg font-semibold underline break-words"
                    href={`/${language}/announcements/${item.announcement_id}`}
                  >
                    {item.title}
                  </Link>
                  <p>
                    {categories[item.category_name]} ·{" "}
                    <time dateTime={item.published_date}>
                      {item.published_date}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          )}
          <nav aria-label={t.title} className="flex flex-wrap gap-5">
            {page > 1 ? (
              <Link href={`/${language}/announcements?page=${page - 1}`}>
                {t.previous}
              </Link>
            ) : null}
            <span>
              {list.current_page} / {list.last_page}
            </span>
            {page < list.last_page ? (
              <Link href={`/${language}/announcements?page=${page + 1}`}>
                {t.next}
              </Link>
            ) : null}
          </nav>
        </>
      )}
    </main>
  );
}
