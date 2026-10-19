import { identityApiTypes } from "@kpool/types";
import type { z } from "zod";

export type PrincipalStatus = z.infer<
  typeof identityApiTypes.schemas.KPool_Common_PrincipalStatus
>;
export type PrincipalStatusUpdate = {
  principalIdentifier: string;
  status: PrincipalStatus;
};
