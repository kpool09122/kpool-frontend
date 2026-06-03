"use client";

import {
  toWikiEditRequestPayload,
  type WikiDraftDetail,
  type WikiDraftStatus,
  type WikiEditRequestPayload,
} from "@kpool/wiki";
import { wikiPrivateApiTypes } from "@kpool/types";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

import { createSubmitWikiRequestBody } from "@/gateways/wiki/draftWiki";

export type WikiSaveResult = { ok: true; status?: WikiDraftStatus } | { ok: false };

export const saveWikiDraft = async (draft: WikiDraftDetail): Promise<WikiSaveResult> => {
  const response = await fetch(
    `/api/wiki/drafts/${encodeURIComponent(draft.wikiIdentifier)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toWikiEditRequestPayload(draft)),
    },
  );

  if (!response.ok) {
    return { ok: false };
  }

  parseWithSchemaLog("wiki draft save response", wikiPrivateApiTypes.schemas.DraftWikiSummary, await response.json());

  return { ok: true };
};

export const submitWikiDraft = async (draft: WikiDraftDetail): Promise<WikiSaveResult> => {
  const response = await fetch(
    `/api/wiki/drafts/${encodeURIComponent(draft.wikiIdentifier)}/submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createSubmitWikiRequestBody(draft)),
    },
  );

  if (!response.ok) {
    return { ok: false };
  }

  const body = parseWithSchemaLog(
    "wiki draft submit response",
    wikiPrivateApiTypes.schemas.DraftWikiSummary,
    await response.json(),
  );

  return {
    ok: true,
    status: body.status === "under_review" ? body.status : undefined,
  };
};

export const createSaveWikiDraftBody = (
  draft: WikiDraftDetail,
): WikiEditRequestPayload => toWikiEditRequestPayload(draft);
