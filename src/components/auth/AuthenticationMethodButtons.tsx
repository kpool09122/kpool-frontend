"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { IdentityProvider } from "@/gateways/auth/authFlow";

type ButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

export function SocialAuthenticationButton({ provider, children, ...props }: ButtonProps & { provider: IdentityProvider }) {
  return (
    <button type="button" {...props}
      className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-lg px-5 py-0 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${provider.buttonClassName}`}>
      <span className="inline-flex h-12 w-12 items-center justify-center" aria-hidden="true">
        <Image src={provider.iconSrc} alt="" width={provider.iconSize} height={provider.iconSize}
          className={`${provider.iconClassName} object-contain`} />
      </span>
      {children}
    </button>
  );
}

export function PasskeyAuthenticationButton({ children, ...props }: ButtonProps) {
  return (
    <button type="button" {...props}
      className="flex min-h-12 w-full items-center justify-center rounded-lg border border-brand-primary bg-surface-base px-5 py-3 text-sm font-semibold text-brand-primary transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-70">
      {children}
    </button>
  );
}
