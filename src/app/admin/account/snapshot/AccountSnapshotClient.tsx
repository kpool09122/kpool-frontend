"use client";

import { AccountSnapshotPanel } from "../AccountSnapshotPanel";
import { useAccountSection } from "../AccountSectionContext";

export function AccountSnapshotClient() {
  const { accountIdentifier, canEdit } = useAccountSection();

  return <AccountSnapshotPanel accountIdentifier={accountIdentifier} canEdit={canEdit} />;
}
