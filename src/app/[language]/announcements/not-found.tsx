"use client";
import { useI18n } from "@/i18n/I18nProvider";
export default function NotFound() {
  const { dictionary } = useI18n();
  return (
    <p className="p-8" role="alert">
      {dictionary.announcements.notFound}
    </p>
  );
}
