"use client";

import {
  addWikiBlock,
  addWikiSection,
  deleteWikiContent,
  normalizeWikiSectionsForEditing,
  toWikiEditPayload,
  updateWikiBlock,
  updateWikiSection,
  type WikiBlock,
  type WikiBlockType,
  type WikiContentEditorId,
  type WikiDetail,
  type WikiEditPayload,
} from "@kpool/wiki";
import { useMemo, useState } from "react";

type WikiSaveState =
  | {
      status: "dirty";
      message: string;
      payload: WikiEditPayload;
    }
  | {
      status: "saved";
      message: string;
      payload: WikiEditPayload;
    }
  | {
      status: "saving";
      message: string;
      payload: WikiEditPayload;
    }
  | {
      status: "failed";
      message: string;
      payload: WikiEditPayload;
    };

type WikiEditDraftOptions = {
  saveAdapter?: (payload: WikiEditPayload) => { ok: true } | { ok: false };
};

const optimisticSaveAdapter = () => ({ ok: true }) as const;

const createInitialDraft = (wiki: WikiDetail): WikiDetail => ({
  ...wiki,
  sections: normalizeWikiSectionsForEditing(wiki.sections),
});

export const useWikiEditDraft = (
  wiki: WikiDetail,
  options?: WikiEditDraftOptions,
) => {
  const initialDraft = useMemo(() => createInitialDraft(wiki), [wiki]);
  const [draft, setDraft] = useState<WikiDetail>(initialDraft);
  const [editingId, setEditingId] = useState<WikiContentEditorId | "basic" | "hero" | null>(
    null,
  );
  const [saveState, setSaveState] = useState<WikiSaveState>({
    status: "saved",
    message: "Saved",
    payload: toWikiEditPayload(initialDraft),
  });
  const saveAdapter = options?.saveAdapter ?? optimisticSaveAdapter;

  const commitDraft = (nextDraft: WikiDetail) => {
    const payload = toWikiEditPayload(nextDraft);

    setDraft(nextDraft);
    setSaveState({
      status: "dirty",
      message: "Unsaved changes",
      payload,
    });
  };

  const saveDraft = () => {
    const payload = toWikiEditPayload(draft);

    setSaveState({
      status: "saving",
      message: "Saving changes",
      payload,
    });

    queueMicrotask(() => {
      const result = saveAdapter(payload);

      setSaveState({
        status: result.ok ? "saved" : "failed",
        message: result.ok ? "Saved" : "Save failed",
        payload,
      });
    });
  };

  const clearDraft = () => {
    setDraft(initialDraft);
    setEditingId(null);
    setSaveState({
      status: "saved",
      message: "Saved",
      payload: toWikiEditPayload(initialDraft),
    });
  };

  return {
    draft,
    editingId,
    saveState,
    clearDraft,
    saveDraft,
    setEditingId,
    updateBasic: (basic: WikiDetail["basic"]) =>
      commitDraft({
        ...draft,
        basic,
      }),
    updateHeroImage: (heroImage: WikiDetail["heroImage"]) =>
      commitDraft({
        ...draft,
        heroImage,
      }),
    updateSection: (
      sectionIdentifier: string,
      changes: Parameters<typeof updateWikiSection>[2],
    ) =>
      commitDraft({
        ...draft,
        sections: updateWikiSection(draft.sections, sectionIdentifier, changes),
      }),
    updateBlock: (blockIdentifier: string, changes: Partial<WikiBlock>) =>
      commitDraft({
        ...draft,
        sections: updateWikiBlock(draft.sections, blockIdentifier, changes),
      }),
    addSection: (parentSectionIdentifier?: string) => {
      const [sections, nextEditingId] = addWikiSection(
        draft.sections,
        parentSectionIdentifier,
      );

      commitDraft({
        ...draft,
        sections,
      });
      setEditingId(nextEditingId);
    },
    addBlock: (sectionIdentifier: string, blockType: WikiBlockType) => {
      const [sections, nextEditingId] = addWikiBlock(
        draft.sections,
        sectionIdentifier,
        blockType,
      );

      commitDraft({
        ...draft,
        sections,
      });
      setEditingId(nextEditingId);
    },
    deleteContent: (identifier: string) => {
      commitDraft({
        ...draft,
        sections: deleteWikiContent(draft.sections, identifier),
      });
      setEditingId(null);
    },
  };
};
