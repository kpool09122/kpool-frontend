"use client";

import type { CSSProperties, ReactNode } from "react";

export type WikiListCardMeta = {
  label: string;
  value: string;
};

export function WikiListCard({
  actions,
  badgeLabel,
  headerActions,
  href,
  hasTheme,
  isOnImage,
  meta,
  style,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  badgeLabel: string;
  headerActions?: ReactNode;
  hasTheme?: boolean;
  href: string;
  isOnImage?: boolean;
  meta: WikiListCardMeta[];
  style?: CSSProperties;
  subtitle: string;
  title: string;
}) {
  return (
    <article
      className="wiki-theme-scope min-w-0 rounded-lg border border-stroke-subtle bg-surface-base bg-cover bg-center p-4 shadow-soft"
      style={style}
    >
      <div className="relative z-10">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold">
              <a
                className="text-brand-primary underline underline-offset-4"
                href={href}
                style={{ color: isOnImage ? "#fffaf4" : undefined }}
              >
                {title}
              </a>
            </h3>
            <p
              className="mt-1 text-xs font-semibold uppercase text-text-muted"
              style={{ color: isOnImage ? "rgba(255, 250, 244, 0.78)" : undefined }}
            >
              {subtitle}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <span
              className="rounded-full border border-stroke-subtle px-2.5 py-1 text-xs font-semibold text-text-muted"
              style={{
                backgroundColor: isOnImage
                  ? "rgba(255, 255, 255, 0.86)"
                  : hasTheme
                    ? "var(--wiki-accent-background, rgba(255, 214, 194, 0.6))"
                    : undefined,
                color: isOnImage
                  ? "#15243b"
                  : hasTheme
                    ? "var(--wiki-accent-text)"
                    : undefined,
              }}
            >
              {badgeLabel}
            </span>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm">
          {meta.map((item) => (
            <WikiListCardMetaItem
              isOnImage={Boolean(isOnImage)}
              key={`${item.label}:${item.value}`}
              label={item.label}
              value={item.value}
            />
          ))}
        </dl>
        {actions}
      </div>
    </article>
  );
}

function WikiListCardMetaItem({
  isOnImage,
  label,
  value,
}: {
  isOnImage: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt
        className="font-semibold text-text-muted"
        style={{ color: isOnImage ? "rgba(255, 250, 244, 0.78)" : undefined }}
      >
        {label}
      </dt>
      <dd
        className="mt-1 break-words text-text-strong"
        style={{ color: isOnImage ? "rgba(255, 250, 244, 0.94)" : undefined }}
      >
        {value}
      </dd>
    </div>
  );
}

export function WikiListCardActionButton({
  children,
  disabled,
  isOnImage,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  disabled?: boolean;
  isOnImage?: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      className={getActionClassName(variant)}
      disabled={disabled}
      onClick={onClick}
      style={getActionStyle(variant, Boolean(isOnImage))}
      type="button"
    >
      {children}
    </button>
  );
}

export function WikiListCardActionLink({
  children,
  href,
  isOnImage,
}: {
  children: ReactNode;
  href: string;
  isOnImage?: boolean;
}) {
  return (
    <a
      className={getActionClassName("secondary")}
      href={href}
      style={getActionStyle("secondary", Boolean(isOnImage))}
    >
      {children}
    </a>
  );
}

export function WikiListCardDisabledAction({
  children,
  isOnImage,
}: {
  children: ReactNode;
  isOnImage?: boolean;
}) {
  return (
    <button
      className="rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold opacity-60 disabled:cursor-not-allowed"
      disabled
      style={getActionStyle("secondary", Boolean(isOnImage))}
      type="button"
    >
      {children}
    </button>
  );
}

const getActionClassName = (variant: "primary" | "secondary" | "danger"): string => {
  if (variant === "primary") {
    return "rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60";
  }

  if (variant === "danger") {
    return "rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60";
  }

  return "rounded-lg border border-stroke-subtle px-4 py-2 text-sm font-semibold transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-60";
};

const getActionStyle = (
  variant: "primary" | "secondary" | "danger",
  isOnImage: boolean,
): CSSProperties | undefined => {
  if (!isOnImage || variant !== "secondary") {
    return undefined;
  }

  return {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    color: "#15243b",
  };
};
