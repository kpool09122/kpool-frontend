"use client";

import {
  toWikiEditRequestPayload,
  type WikiDetail,
  type WikiEditRequestPayload,
} from "@kpool/wiki";
import { schemas } from "@kpool/types/wiki-private-api";

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

  schemas.DraftWikiSummary.parse(await response.json());

  return { ok: true };
};

export const createSaveWikiDraftBody = (
  draft: WikiDetail,
): WikiEditRequestPayload => toWikiEditRequestPayload(draft);
