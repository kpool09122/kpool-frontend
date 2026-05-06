"use client";

import { useI18n } from "../i18n/I18nProvider";

export default function MyPage() {
  const { dictionary } = useI18n();
  const t = dictionary.mypage;

  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-12 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">
          {t.eyebrow}
        </p>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="text-sm leading-7 text-text-muted">
          {t.description}
        </p>
      </div>
    </main>
  );
}
