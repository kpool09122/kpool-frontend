import Image from "next/image";

const badgeSrc = "/official_certification_budge.webp";

export const officialCertificationBadgeAlt = "公式認証済みWiki";

type OfficialCertificationBadgeProps = {
  className?: string;
};

export function OfficialCertificationBadge({
  className = "h-6 w-6",
}: OfficialCertificationBadgeProps) {
  return (
    <Image
      alt={officialCertificationBadgeAlt}
      className={`inline-block shrink-0 align-middle ${className}`}
      height={24}
      src={badgeSrc}
      width={24}
    />
  );
}
