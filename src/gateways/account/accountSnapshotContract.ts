import { accountApiTypes } from "@kpool/types";
import { z } from "zod";
const summary = accountApiTypes.schemas.AccountSnapshotSummary.strip();
const profile = accountApiTypes.schemas.AccountSnapshotProfile.strip();
const documents = z.array(accountApiTypes.schemas.AccountSnapshotDocument.strip());
const change = accountApiTypes.schemas.AccountSnapshotChangeRequestSummary.extend({
  rejectionReason: accountApiTypes.schemas.AccountSnapshotChangeRequestSummary.shape.rejectionReason.unwrap().strip().nullable(),
}).strip();
// Generated AccountSnapshotDetail aliases the summary. Compose the omitted
// fields from generated schemas, matching backend account-snapshot.tsp.
const detail = summary.extend({ isCurrent: z.boolean(), account: profile, documents });
export const snapshotSchemas = {
  summary,
  detail,
  latest: z.object({ request: change.nullable(), changeRequiresApproval: z.boolean() }),
  change,
  changeBody: accountApiTypes.schemas.RequestAccountSnapshotChangeBody.strip(),
  reviewBody: accountApiTypes.schemas.RejectAccountCategoryChangeRequestBody.strip(),
  comparison: accountApiTypes.schemas.AccountSnapshotChangeRequestDetail.extend({ request: change, original: detail, proposal: accountApiTypes.schemas.AccountSnapshotChangeProposal.extend({ account: profile, documents }).strip() }).strip(),
  list: z.object({ requests: z.array(change), pagination: z.object({ currentPage: z.number().int(), lastPage: z.number().int(), total: z.number().int(), perPage: z.number().int() }) }),
};
export type AccountSnapshot = z.infer<typeof detail>;
export type SnapshotChange = z.infer<typeof change>;
export const snapshotAccountPath = (accountId: string) => `accounts/${encodeURIComponent(accountId)}`;
export const snapshotRequestPath = (requestId: string) => `account-snapshot-change-requests/${encodeURIComponent(requestId)}`;
