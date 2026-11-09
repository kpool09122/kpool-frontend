import type { Metadata } from "next";
import { dictionaries } from "@/i18n/dictionaries";
import { fallbackLocale, normalizeLocale, type Locale } from "@/i18n/locales";

export const siteTitle = "k-pool";

const descriptions = {
  ja: {
    home: "K-POPのタレント・グループ・事務所・楽曲の情報を探せるWiki、k-pool。新着や最近更新されたWikiから、気になる情報を見つけられます。",
    wiki: "k-poolの公開Wikiを検索。K-POPのタレント・グループ・事務所・楽曲の情報を、名前や種類から探せます。",
    announcements: "k-poolからのお知らせ。サービスの最新情報、アップデート、メンテナンス情報をご確認いただけます。",
    signup: "k-poolのアカウント登録ページです。メールアドレスを使って、新しいアカウントを作成できます。",
  },
  en: {
    home: "Explore K-pop talents, groups, agencies, and songs on k-pool, a multilingual wiki. Discover new and recently updated wikis.",
    wiki: "Search public wikis on k-pool. Find information about K-pop talents, groups, agencies, and songs by name or type.",
    announcements: "Read the latest news, service updates, and maintenance announcements from k-pool.",
    signup: "Create a k-pool account using your email address.",
  },
  ko: {
    home: "K-POP 탤런트, 그룹, 소속사, 곡 정보를 찾을 수 있는 다국어 위키 k-pool. 새로 등록되거나 최근 업데이트된 위키를 살펴보세요.",
    wiki: "k-pool의 공개 위키를 검색하세요. K-POP 탤런트, 그룹, 소속사, 곡 정보를 이름이나 유형으로 찾을 수 있습니다.",
    announcements: "k-pool의 최신 소식, 서비스 업데이트 및 점검 안내를 확인하세요.",
    signup: "이메일 주소로 새로운 k-pool 계정을 만드세요.",
  },
} satisfies Record<
  Locale,
  Record<"home" | "wiki" | "announcements" | "signup", string>
>;

type MetadataPage =
  | "home"
  | "wiki"
  | "announcements"
  | "login"
  | "signup"
  | "contact";

export function buildPageMetadata(language: string, page: MetadataPage): Metadata {
  const locale = normalizeLocale(language) ?? fallbackLocale;
  const t = dictionaries[locale];
  const titles = {
    home: siteTitle,
    wiki: t.home.listTitle,
    announcements: t.announcements.title,
    login: t.login.title,
    signup: t.signup.title,
    contact: t.contact.title,
  };
  const description =
    page === "contact" ? t.contact.description
      : page === "login" ? t.login.description
        : descriptions[locale][page];
  return {
    title: page === "home" ? siteTitle : `${titles[page]} | ${siteTitle}`,
    description,
  };
}

export function buildWikiDescription(language: string, name: string): string {
  const locale = normalizeLocale(language) ?? fallbackLocale;
  const descriptions = {
    ja: `${name}の基本情報や関連情報をまとめたk-poolの公開Wikiです。`,
    en: `Explore basic information and related content about ${name} on the k-pool public wiki.`,
    ko: `${name}의 기본 정보와 관련 내용을 확인할 수 있는 k-pool 공개 위키입니다.`,
  };
  return descriptions[locale];
}
