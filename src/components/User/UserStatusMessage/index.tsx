"use client";

import type { ReactNode } from "react";

type UserStatusMessageVariant = "error" | "success" | "warning";

export function UserStatusMessage({
  children,
  className = "",
  variant,
}: {
  children: ReactNode;
  className?: string;
  variant: UserStatusMessageVariant;
}) {
  const role = variant === "error" ? "alert" : "status";

  return (
    <p className={`${getStatusMessageClassName(variant)} ${className}`.trim()} role={role}>
      {children}
    </p>
  );
}

const getStatusMessageClassName = (variant: UserStatusMessageVariant): string => {
  if (variant === "error") {
    return "rounded-lg border border-status-danger bg-status-danger/10 p-3 text-sm font-semibold text-status-danger";
  }

  if (variant === "success") {
    return "rounded-lg border border-status-success bg-status-success/10 p-3 text-sm font-semibold text-status-success";
  }

  return "rounded-lg border border-status-warning bg-status-warning/10 p-3 text-sm font-semibold text-status-warning";
};
