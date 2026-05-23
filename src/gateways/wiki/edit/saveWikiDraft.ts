"use client";

import {
  toWikiEditRequestPayload,
  type WikiDetail,
  type WikiEditRequestPayload,
} from "@kpool/wiki";
import { wikiPrivateApiTypes } from "@kpool/types";

import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";

import { createSubmitWikiRequestBody } from "@/gateways/wiki/draftWiki";

export type WikiSaveResult = { ok: true } | { ok: false };

export const saveWikiDraft = async (draft: WikiDetail): Promise<WikiSaveResult> => {
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

export const submitWikiDraft = async (draft: WikiDetail): Promise<WikiSaveResult> => {
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

  parseWithSchemaLog("wiki draft save response", wikiPrivateApiTypes.schemas.DraftWikiSummary, await response.json());

  return { ok: true };
};

export const createSaveWikiDraftBody = (
  draft: WikiDetail,
): WikiEditRequestPayload => toWikiEditRequestPayload(draft);
