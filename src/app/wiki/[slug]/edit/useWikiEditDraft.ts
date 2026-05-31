"use client";

import {
  addWikiBlock,
  addWikiSection,
  deleteWikiContent,
  normalizeWikiSectionsForEditing,
  parseWikiSectionsFromCode,
  serializeWikiSectionsToCode,
  toWikiEditPayload,
  updateWikiBlock,
  updateWikiSection,
  type WikiBlock,
  type WikiBlockType,
  type WikiContentEditorId,
  type WikiDraftDetail,
  type WikiEditPayload,
} from "@kpool/wiki";
import { useMemo, useState } from "react";

import {
  normalizeWikiSlugForResourceType,
  type WikiResourceType,
} from "@kpool/wiki";

type WikiSaveState =
  | {
      status: "dirty";
      message: string;
      payload: WikiEditPayload;
      showMessage: boolean;
    }
  | {
      status: "saved";
      message: string;
      payload: WikiEditPayload;
      showMessage: boolean;
    }
  | {
      status: "saving";
      message: string;
      payload: WikiEditPayload;
      showMessage: boolean;
    }
  | {
      status: "submitting";
      message: string;
      payload: WikiEditPayload;
      showMessage: boolean;
    }
  | {
      status: "failed";
      message: string;
      payload: WikiEditPayload;
      showMessage: boolean;
    };

type WikiPersistenceResult = { ok: true } | { ok: false };

type WikiEditDraftOptions = {
  saveAdapter?: (draft: WikiDraftDetail) => unknown;
  submitAdapter?: (draft: WikiDraftDetail) => unknown;
};

const isWikiPersistenceResult = (value: unknown): value is WikiPersistenceResult =>
  typeof value === "object" &&
  value !== null &&
  "ok" in value &&
  typeof value.ok === "boolean";

const optimisticSaveAdapter = async () => ({ ok: true }) as const;
const optimisticActionAdapter = async () => ({ ok: true }) as const;

const createInitialDraft = (wiki: WikiDraftDetail): WikiDraftDetail => ({
  ...wiki,
  sections: normalizeWikiSectionsForEditing(wiki.sections),
});

const getCodeFromSections = (sections: WikiDraftDetail["sections"]): string =>
  serializeWikiSectionsToCode(sections);

const getWarningsFromCode = (code: string): string[] => {
  const parsed = parseWikiSectionsFromCode(code);

  return parsed.ok ? parsed.warnings : [];
};

export const useWikiEditDraft = (
  wiki: WikiDraftDetail,
  options?: WikiEditDraftOptions,
) => {
  const initialDraft = useMemo(() => createInitialDraft(wiki), [wiki]);
  const initialCode = useMemo(() => getCodeFromSections(initialDraft.sections), [initialDraft]);
  const [draft, setDraft] = useState<WikiDraftDetail>(initialDraft);
  const [code, setCode] = useState(initialCode);
  const [codeParseError, setCodeParseError] = useState<string | null>(null);
  const [codeWarnings, setCodeWarnings] = useState(() => getWarningsFromCode(initialCode));
  const [editingId, setEditingId] = useState<WikiContentEditorId | "basic" | "hero" | null>(
    null,
  );
  const [saveState, setSaveState] = useState<WikiSaveState>({
    status: "saved",
    message: "Saved",
    payload: toWikiEditPayload(initialDraft),
    showMessage: false,
  });
  const saveAdapter = options?.saveAdapter ?? optimisticSaveAdapter;
  const submitAdapter = options?.submitAdapter ?? optimisticActionAdapter;

  const commitDraft = (
    nextDraft: WikiDraftDetail,
    nextCode = getCodeFromSections(nextDraft.sections),
  ) => {
    const parsedCode = parseWikiSectionsFromCode(nextCode);
    const payload = toWikiEditPayload(nextDraft);

    setDraft(nextDraft);
    setCode(nextCode);
    setCodeParseError(null);
    setCodeWarnings(parsedCode.ok ? parsedCode.warnings : []);
    setSaveState({
      status: "dirty",
      message: "Unsaved changes",
      payload,
      showMessage: true,
    });
  };

  const saveDraft = () => {
    const payload = toWikiEditPayload(draft);

    setSaveState({
      status: "saving",
      message: "Saving changes",
      payload,
      showMessage: true,
    });

    void Promise.resolve(saveAdapter(draft)).then((adapterResult) => {
      const result = isWikiPersistenceResult(adapterResult) ? adapterResult : { ok: false };

      setSaveState({
        status: result.ok ? "saved" : "failed",
        message: result.ok ? "Saved" : "Save failed",
        payload,
        showMessage: true,
      });
    }).catch(() => {
      setSaveState({
        status: "failed",
        message: "Save failed",
        payload,
        showMessage: true,
      });
    });
  };

  const clearDraft = () => {
    setDraft(initialDraft);
    setCode(getCodeFromSections(initialDraft.sections));
    setCodeParseError(null);
    setCodeWarnings([]);
    setEditingId(null);
    setSaveState({
      status: "saved",
      message: "Saved",
      payload: toWikiEditPayload(initialDraft),
      showMessage: false,
    });
  };

  const requestPublication = () => {
    const payload = toWikiEditPayload(draft);

    setSaveState({
      status: "submitting",
      message: "Submitting for review",
      payload,
      showMessage: true,
    });

    void Promise.resolve(submitAdapter(draft)).then((adapterResult) => {
      const result = isWikiPersistenceResult(adapterResult) ? adapterResult : { ok: false };

      setSaveState({
        status: result.ok ? "saved" : "failed",
        message: result.ok ? "Submitted for review" : "Submit failed",
        payload,
        showMessage: true,
      });
    }).catch(() => {
      setSaveState({
        status: "failed",
        message: "Submit failed",
        payload,
        showMessage: true,
      });
    });
  };

  return {
    canPersist: !codeParseError,
    code,
    codeParseError,
    codeWarnings,
    draft,
    editingId,
    saveState,
    clearDraft,
    requestPublication,
    saveDraft,
    setEditingId,
    updateCode: (nextCode: string) => {
      setCode(nextCode);
      const parsed = parseWikiSectionsFromCode(nextCode);

      if (!parsed.ok) {
        setCodeParseError(parsed.message);
        setCodeWarnings([]);
        setSaveState({
          status: "dirty",
          message: "Unsaved changes",
          payload: toWikiEditPayload(draft),
          showMessage: true,
        });
        return;
      }

      commitDraft(
        {
          ...draft,
          sections: parsed.sections,
        },
        nextCode,
      );
    },
    updateBasic: (basic: WikiDraftDetail["basic"]) =>
      commitDraft({
        ...draft,
        basic,
        resourceType: basic.resourceType,
        slug: normalizeWikiSlugForResourceType(
          draft.slug,
          basic.resourceType as WikiResourceType,
        ),
      }),
    updateHeroImage: (heroImage: WikiDraftDetail["heroImage"]) =>
      commitDraft({
        ...draft,
        heroImage,
      }),
    updateSettings: (
      settings: Partial<Pick<WikiDraftDetail, "resourceType" | "slug" | "themeColor">>,
    ) => {
      const nextResourceType =
        (settings.resourceType as WikiResourceType | undefined) ??
        (draft.resourceType as WikiResourceType);

      commitDraft({
        ...draft,
        ...settings,
        resourceType: nextResourceType,
        basic: {
          ...draft.basic,
          resourceType: nextResourceType,
        },
        slug: normalizeWikiSlugForResourceType(
          settings.slug ?? draft.slug,
          nextResourceType,
        ),
      });
    },
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
