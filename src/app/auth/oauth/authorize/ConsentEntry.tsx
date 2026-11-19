"use client";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OAuthConsentPage } from "./OAuthConsentPage";
export function ConsentEntry() {
  const params = useSearchParams();
  const query = params.toString();
  const router = useRouter();
  const restored = useRef(false);
  const returning = params.get("stepUp") === "complete";
  useEffect(() => {
    if (!returning || restored.current) return;
    restored.current = true;
    const saved = sessionStorage.getItem("oauth-step-up-query");
    sessionStorage.removeItem("oauth-step-up-query");
    // Restore only the query of this fixed local consent page; never a supplied redirect URL.
    router.replace(`/auth/oauth/authorize${saved ? `?${saved}` : ""}`);
  }, [returning, router]);
  return returning ? null : <OAuthConsentPage key={query} query={query} />;
}
