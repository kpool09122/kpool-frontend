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
    return "rounded-lg border border-status-danger bg-status-danger/10 p-3 text-sm font-semibold text-status-danger";
  }

  if (variant === "success") {
    return "rounded-lg border border-status-success bg-status-success/10 p-3 text-sm font-semibold text-status-success";
  }

  if (variant === "warning") {
    return "rounded-lg border border-status-warning bg-status-warning/10 p-3 text-sm font-semibold text-status-warning";
  }

  return "rounded-lg border border-dashed border-stroke-subtle p-4 text-sm font-semibold text-text-muted";
};
