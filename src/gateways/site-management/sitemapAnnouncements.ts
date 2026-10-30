import { supportedLocales, type Locale } from "@/i18n/locales";
import { loadPublicAnnouncements } from "./publicAnnouncements";

export type SitemapAnnouncement = {
  language: Locale;
  identifier: string;
};

export const loadSitemapAnnouncements = async () => {
  const announcements: SitemapAnnouncement[] = [];
  for (const language of supportedLocales) {
    let page = 1;
    let lastPage = 1;
    do {
      const result = await loadPublicAnnouncements(language, page);
      if (!result.ok || !result.list || result.list.current_page !== page)
        return { status: "error" } as const;
      lastPage = result.list.last_page;
      if (lastPage < page) return { status: "error" } as const;
      for (const item of result.list.announcements) {
        announcements.push({ language, identifier: item.announcement_id });
      }
      page += 1;
    } while (page <= lastPage);
  }
  return { status: "success", announcements } as const;
};
