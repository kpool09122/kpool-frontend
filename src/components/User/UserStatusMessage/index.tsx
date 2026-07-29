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
    return "rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800";
  }

  if (variant === "success") {
    return "rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800";
  }

  return "rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800";
};
