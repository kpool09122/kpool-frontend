"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

type AdminNavigationLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/** Keep the analysis preview enabled when navigating within admin menus. */
export function AdminNavigationLink({ href, ...props }: AdminNavigationLinkProps) {
  const searchParams = useSearchParams();
  if (searchParams.get("test") !== "true") return <Link href={href} {...props} />;

  const [pathAndQuery, hash] = href.split("#", 2);
  const [pathname, query] = pathAndQuery.split("?", 2);
  const destinationParams = new URLSearchParams(query);
  destinationParams.set("test", "true");
  const destination = `${pathname}?${destinationParams}${hash === undefined ? "" : `#${hash}`}`;
  return <Link href={destination} {...props} />;
}
