"use client";
import { useSearchParams } from "next/navigation";
import { OAuthConsentPage } from "./OAuthConsentPage";
export function ConsentEntry() {
  const query = useSearchParams().toString();
  return <OAuthConsentPage key={query} query={query} />;
}
