"use client";
import { useI18n } from "@/i18n/I18nProvider";
export default function Loading() {
  const { dictionary } = useI18n();
  return (
    <p className="p-8" role="status">
      {dictionary.announcements.loading}
    </p>
  );
}
