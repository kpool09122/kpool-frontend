"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import {
  identityProviders,
  loginWithEmail,
  normalizeReturnTo,
  requestSocialRedirect,
  type IdentityProvider,
  type LoginAdapter,
  type SocialRedirectAdapter,
} from "./authFlow";

type LoginPageProps = {
  loginAdapter?: LoginAdapter;
  socialRedirectAdapter?: SocialRedirectAdapter;
  navigate?: (url: string) => void;
  refresh?: () => void;
  returnTo?: string | null;
};

type PendingAction =
  | { type: "email" }
  | { type: "social"; provider: IdentityProvider["id"] }
  | null;

const getSocialButtonClassName = (provider: IdentityProvider): string =>
  [
    "flex min-h-12 items-center justify-center gap-3 rounded-lg px-5 py-0 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
    provider.buttonClassName,
  ].join(" ");

const defaultNavigate = (url: string): void => {
  window.location.assign(url);
};

const getCurrentReturnTo = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("returnTo");
};

export function LoginPage({
  loginAdapter = loginWithEmail,
  socialRedirectAdapter = requestSocialRedirect,
  navigate,
  refresh,
  returnTo,
}: LoginPageProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const destination = useMemo(
    () => normalizeReturnTo(returnTo ?? getCurrentReturnTo()),
    [returnTo],
  );

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setPendingAction({ type: "email" });

    const result = await loginAdapter({ email, password });

    if (result.ok) {
      if (navigate) {
        navigate(destination);
      } else {
        router.replace(destination);
        router.refresh();
      }
      refresh?.();
      return;
    }

    setErrorMessage(result.message);
    setPendingAction(null);
  };

  const handleSocialLogin = async (provider: IdentityProvider["id"]) => {
    setErrorMessage(null);
    setPendingAction({ type: "social", provider });

    const result = await socialRedirectAdapter(provider);

    if (result.ok) {
      if (navigate) {
        navigate(result.redirectUrl);
      } else {
        defaultNavigate(result.redirectUrl);
      }
      return;
    }

    setErrorMessage(result.message);
    setPendingAction(null);
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">
              K-Pool Account
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">ログイン</h1>
          </div>

          <div className="grid gap-3">
            {identityProviders.map((provider) => {
              const isPending =
                pendingAction?.type === "social" &&
                pendingAction.provider === provider.id;

              return (
                <button
                  key={provider.id}
                  type="button"
                  className={getSocialButtonClassName(provider)}
                  disabled={pendingAction !== null}
                  onClick={() => void handleSocialLogin(provider.id)}
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center" aria-hidden="true">
                    <Image
                      src={provider.iconSrc}
                      alt=""
                      width={provider.iconSize}
                      height={provider.iconSize}
                      className={`${provider.iconClassName} object-contain`}
                    />
                  </span>
                  {isPending ? (
                    <span>ログインを開始しています</span>
                  ) : (
                    <span>
                      <span className="inline-block min-w-[3.25rem] text-left">
                        {provider.label}
                      </span>
                      <span>でログイン</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-stroke-subtle bg-surface-raised p-6 shadow-[0_12px_36px_rgba(29,47,73,0.08)]">
          <form className="space-y-5" onSubmit={(event) => void handleEmailLogin(event)}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">メールアドレスでログイン</h2>
              <p className="text-sm leading-6 text-text-muted">
                メールアドレスとパスワードでもログインできます。
              </p>
            </div>

            <label className="block space-y-2 text-sm font-semibold">
              <span>メールアドレス</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base text-text-strong outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
              />
            </label>

            <label className="block space-y-2 text-sm font-semibold">
              <span>パスワード</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-stroke-subtle bg-surface-base px-4 py-3 text-base text-text-strong outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-highlight"
              />
            </label>

            {errorMessage ? (
              <p
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center rounded-lg border border-brand-primary bg-surface-base px-5 py-3 text-sm font-semibold text-brand-primary transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={pendingAction !== null}
            >
              {pendingAction?.type === "email"
                ? "ログインしています"
                : "メールアドレスでログイン"}
            </button>

            <p className="text-center text-sm text-text-muted">
              アカウントをお持ちでない方は{" "}
              <Link
                href="/signup"
                className="font-semibold text-brand-primary underline-offset-4 hover:underline"
              >
                アカウント登録へ
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
