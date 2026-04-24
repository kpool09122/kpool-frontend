"use client";

import {
  toWikiEditRequestPayload,
  type WikiDetail,
  type WikiEditRequestPayload,
} from "@kpool/wiki";

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

  return response.ok ? { ok: true } : { ok: false };
};

export const createSaveWikiDraftBody = (
  draft: WikiDetail,
): WikiEditRequestPayload => toWikiEditRequestPayload(draft);
