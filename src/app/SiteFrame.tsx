"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteFrame({ children, header, footer }: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const showNavigation = pathname !== "/auth/oauth/authorize";

  return <>
    {showNavigation ? header : null}
    <div className="flex flex-1 flex-col">{children}</div>
    {showNavigation ? footer : null}
  </>;
}
