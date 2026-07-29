"use client";

import type { ReactNode } from "react";

type AccountStatusMessageVariant = "empty" | "error" | "loading" | "success" | "warning";

export function AccountStatusMessage({
  action,
  children,
  className = "",
  variant,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant: AccountStatusMessageVariant;
}) {
  const role = variant === "error" ? "alert" : variant === "success" || variant === "warning" ? "status" : undefined;

  return (
    <div className={`${getStatusMessageClassName(variant)} ${className}`.trim()} role={role}>
      <p>{children}</p>
      {action}
    </div>
  );
}

const getStatusMessageClassName = (variant: AccountStatusMessageVariant): string => {
  if (variant === "error") {
    return "rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800";
  }

  if (variant === "success") {
    return "rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800";
  }

  if (variant === "warning") {
    return "rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800";
  }

  return "rounded-lg border border-dashed border-stroke-subtle p-4 text-sm font-semibold text-text-muted";
};
