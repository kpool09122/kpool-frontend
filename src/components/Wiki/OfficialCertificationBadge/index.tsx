"use client";

import { useI18n } from "@/i18n/I18nProvider";

import Image from "next/image";

const badgeSrc = "/official_certification_budge.webp";

type OfficialCertificationBadgeProps = {
  className?: string;
};

export function OfficialCertificationBadge({
  className = "h-6 w-6",
}: OfficialCertificationBadgeProps) {
  const { dictionary } = useI18n();
  return (
    <Image
      alt={dictionary.wiki.ui.officialCertified}
      className={`inline-block shrink-0 align-middle ${className}`}
      height={24}
      src={badgeSrc}
      width={24}
    />
  );
}
