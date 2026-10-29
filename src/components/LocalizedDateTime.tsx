"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  formatDateTime,
  getBrowserTimeZone,
  type DateTimeFormatOptions,
} from "@/utils/dateTime";

const subscribe = (onChange: () => void) => {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
};
// Match server HTML during hydration, then use the browser's configured zone.
const getServerTimeZone = () => "UTC";

export function useDateTimeFormatter(locale?: string) {
  const i18n = useI18n();
  const timeZone = useSyncExternalStore(subscribe, getBrowserTimeZone, getServerTimeZone);
  return (value: string | null | undefined, options?: DateTimeFormatOptions) =>
    formatDateTime(value, locale ?? i18n.locale ?? "ja", { ...options, timeZone });
}

export function LocalizedDateTime({
  value,
  locale,
  dateOnly = false,
  fallback,
  template,
  className,
}: {
  value: string | null | undefined;
  locale?: string;
  dateOnly?: boolean;
  fallback?: string;
  template?: string;
  className?: string;
}) {
  const format = useDateTimeFormatter(locale);
  const text = format(value, {
    fallback,
    ...(dateOnly ? { timeStyle: undefined } : {}),
  });
  return (
    <time className={className} dateTime={value || undefined}>
      {template ? template.replace("{date}", () => text) : text}
    </time>
  );
}
