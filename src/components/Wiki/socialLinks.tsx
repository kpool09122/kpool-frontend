import { Link2Icon } from "@radix-ui/react-icons";
import { useId } from "react";

const socialPlatforms = [
  { name: "Instagram", domains: ["instagram.com"], path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.5-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" },
  { name: "Facebook", domains: ["facebook.com", "fb.com", "fb.watch"], path: "M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.4A24 24 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v9h4Z" },
  { name: "YouTube", domains: ["youtube.com", "youtu.be"], path: "M23 7a3 3 0 0 0-2-2c-2-.5-16-.5-18 0a3 3 0 0 0-2 2 27 27 0 0 0 0 10 3 3 0 0 0 2 2c2 .5 16 .5 18 0a3 3 0 0 0 2-2 27 27 0 0 0 0-10ZM10 16V8l7 4-7 4Z" },
  { name: "TikTok", domains: ["tiktok.com"], path: "M16 2h-4v13.5a2.5 2.5 0 1 1-2-2.45V9a6.5 6.5 0 1 0 6 6.5V8a10 10 0 0 0 6 2V6a6 6 0 0 1-6-4Z" },
  { name: "X", domains: ["x.com", "twitter.com"], path: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L.8 2h6.5l4.5 6.8L18.9 2ZM17.8 20h1.7L6.3 4H4.5l13.3 16Z" },
];

export const getSocialLinkInfo = (value: string) => {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const platform = socialPlatforms.find(({ domains }) =>
    domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)),
  );
  return { href: url.href, label: platform?.name ?? url.hostname, platform };
};

export function SocialLinkIcon({ url }: { url: string }) {
  const gradientId = useId();
  const platform = getSocialLinkInfo(url)?.platform;
  if (!platform) return <Link2Icon aria-hidden="true" className="h-5 w-5 shrink-0" />;

  const fill = platform.name === "Instagram" ? `url(#${gradientId})`
    : platform.name === "Facebook" ? "#0866FF"
    : platform.name === "YouTube" ? "#FF0000"
    : "currentColor";

  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-text-strong" fill={fill} viewBox="0 0 24 24">
      {platform.name === "Instagram" ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#FEDA75" />
            <stop offset="30%" stopColor="#FA7E1E" />
            <stop offset="55%" stopColor="#D62976" />
            <stop offset="80%" stopColor="#962FBF" />
            <stop offset="100%" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
      ) : null}
      {platform.name === "TikTok" ? (
        <>
          <path d={platform.path} fill="#25F4EE" transform="translate(-0.7 -0.5)" />
          <path d={platform.path} fill="#FE2C55" transform="translate(0.7 0.5)" />
        </>
      ) : null}
      {platform.name === "YouTube" ? <path d="M10 16V8l7 4-7 4Z" fill="#FFFFFF" /> : null}
      <path d={platform.path} />
    </svg>
  );
}
