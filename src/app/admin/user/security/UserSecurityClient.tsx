"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { useUserSection } from "../UserSectionContext";
import { PasskeyManagementPanel } from "./PasskeyManagementPanel";

export function UserSecurityClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentIdentity } = useUserSection();
  const authenticatedIdentity = currentIdentity && "authenticationMethods" in currentIdentity
    ? currentIdentity as AuthenticatedIdentitySummary
    : null;

  return (
    <PasskeyManagementPanel
      linkedSocialProviders={authenticatedIdentity?.authenticationMethods.linkedSocialProviders ?? []}
      onStepUpConsumed={() => router.replace("/admin/user/security")}
      passkeyCount={authenticatedIdentity?.authenticationMethods.passkeyCount ?? 0}
      ssoStepUpCompleted={searchParams.get("stepUp") === "complete"}
    />
  );
}
