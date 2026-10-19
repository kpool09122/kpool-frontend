import { z } from "zod";
import { accountApiTypes } from "@kpool/types";
import { savePrincipalGroupRequest } from "@/gateways/support/principalGroupSave";
import type { UpdatePrincipalGroupMembersRequest } from "./accountApi";
const dataSchema =
  accountApiTypes.schemas.ListPrincipalGroupsResponseBody.extend({
    members: z.array(accountApiTypes.schemas.AccountMemberSummary),
  });
export const saveAccountPrincipalGroups = (
  body: UpdatePrincipalGroupMembersRequest,
) =>
  savePrincipalGroupRequest({
    url: "/api/account/principal-groups/members",
    body,
    dataSchema,
    fallback: "Account permissions could not be saved.",
  });
