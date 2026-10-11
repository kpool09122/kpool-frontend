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
  type WikiDraftStatus,
  type WikiEditPayload,
  type WikiCodeErrorCode,
  type WikiCodeWarningCode,
} from "@kpool/wiki";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  normalizeWikiSlugForResourceType,
  type WikiResourceType,
} from "@kpool/wiki";

type WikiSaveMessage = "dirty" | "saving" | "saved" | "saveFailed" | "submitting" | "submitted" | "submitFailed";

type WikiSaveState = {
  status: "dirty" | "saved" | "saving" | "submitting" | "failed";
  messageKey: WikiSaveMessage;
  payload: WikiEditPayload;
  showMessage: boolean;
};

type WikiPersistenceResult = { ok: true; status?: WikiDraftStatus } | { ok: false };

type WikiEditDraftOptions = {
  onSubmitSuccess?: (result: Extract<WikiPersistenceResult, { ok: true }>) => void;
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

const getWarningsFromCode = (code: string): WikiCodeWarningCode[] => {
  const parsed = parseWikiSectionsFromCode(code);

  return parsed.ok ? parsed.warnings : [];
};

export const useWikiEditDraft = (
  wiki: WikiDraftDetail,
  options?: WikiEditDraftOptions,
) => {
  const initialDraft = useMemo(() => createInitialDraft(wiki), [wiki]);
  const initialCode = useMemo(() => getCodeFromSections(initialDraft.sections), [initialDraft]);
  const [sourceDraft, setSourceDraft] = useState(initialDraft);
  const [draft, setDraft] = useState<WikiDraftDetail>(initialDraft);
  const draftRef = useRef({ source: initialDraft, value: initialDraft, code: initialCode });
  const [code, setCode] = useState(initialCode);
  const [persisted, setPersisted] = useState({ draft: initialDraft, code: initialCode });
  const [codeParseError, setCodeParseError] = useState<WikiCodeErrorCode | null>(null);
  const [codeWarnings, setCodeWarnings] = useState(() => getWarningsFromCode(initialCode));
  const [editingId, setEditingId] = useState<
    WikiContentEditorId | "basic" | "title" | null
  >(null);
  const [newContentEditorId, setNewContentEditorId] =
    useState<WikiContentEditorId | null>(null);
  const [saveState, setSaveState] = useState<WikiSaveState>({
    status: "saved",
    messageKey: "saved",
    payload: toWikiEditPayload(initialDraft),
    showMessage: false,
  });
  const saveAdapter = options?.saveAdapter ?? optimisticSaveAdapter;
  const submitAdapter = options?.submitAdapter ?? optimisticActionAdapter;
  const onSubmitSuccess = options?.onSubmitSuccess;

  if (sourceDraft !== initialDraft) {
    setSourceDraft(initialDraft);
    setPersisted({ draft: initialDraft, code: initialCode });
    setDraft(initialDraft);
    setCode(initialCode);
    setCodeParseError(null);
    setCodeWarnings(getWarningsFromCode(initialCode));
    setEditingId(null);
    setNewContentEditorId(null);
    setSaveState({
      status: "saved",
      messageKey: "saved",
      payload: toWikiEditPayload(initialDraft),
      showMessage: false,
    });
  }

  useLayoutEffect(() => {
    if (draftRef.current.source !== initialDraft) draftRef.current = { source: initialDraft, value: initialDraft, code: initialCode };
  }, [initialDraft, initialCode]);
  const getCurrentDraft = () =>
    draftRef.current.source === initialDraft ? draftRef.current.value : initialDraft;

  const commitDraft = (
    nextDraft: WikiDraftDetail,
    nextCode = getCodeFromSections(nextDraft.sections),
  ) => {
    const parsedCode = parseWikiSectionsFromCode(nextCode);
    const payload = toWikiEditPayload(nextDraft);

    draftRef.current = { source: initialDraft, value: nextDraft, code: nextCode };
    setDraft(nextDraft);
    setCode(nextCode);
    setCodeParseError(null);
    setCodeWarnings(parsedCode.ok ? parsedCode.warnings : []);
    setSaveState({
      status: "dirty",
      messageKey: "dirty",
      payload,
      showMessage: true,
    });
  };

  const hasUnsavedChanges = JSON.stringify(toWikiEditPayload(draft)) !== JSON.stringify(toWikiEditPayload(persisted.draft))
    || (codeParseError !== null && code !== persisted.code);

  const visibleSaveState: WikiSaveState = saveState.status === "saved" && hasUnsavedChanges
    ? { ...saveState, status: "dirty", messageKey: "dirty" }
    : saveState.status === "dirty" && !hasUnsavedChanges
      ? { ...saveState, status: "saved", messageKey: "saved", showMessage: false }
      : saveState;

  const saveDraft = () => {
    const nextDraft = getCurrentDraft();
    const payload = toWikiEditPayload(nextDraft);
    const savedCode = draftRef.current.source === initialDraft ? draftRef.current.code : initialCode;

    setSaveState({
      status: "saving",
      messageKey: "saving",
      payload,
      showMessage: true,
    });

    void Promise.resolve(saveAdapter(nextDraft)).then((adapterResult) => {
      const result: WikiPersistenceResult = isWikiPersistenceResult(adapterResult) ? adapterResult : { ok: false };

      if (draftRef.current.source !== initialDraft) return;
      if (result.ok) setPersisted({ draft: nextDraft, code: savedCode });

      setSaveState({
        status: result.ok ? "saved" : "failed",
        messageKey: result.ok ? "saved" : "saveFailed",
        payload,
        showMessage: true,
      });
    }).catch(() => {
      setSaveState({
        status: "failed",
        messageKey: "saveFailed",
        payload,
        showMessage: true,
      });
    });
  };

  const clearDraft = () => {
    draftRef.current = { source: initialDraft, value: persisted.draft, code: persisted.code };
    setDraft(persisted.draft);
    setCode(persisted.code);
    setCodeParseError(null);
    setCodeWarnings(getWarningsFromCode(persisted.code));
    setEditingId(null);
    setSaveState({
      status: "saved",
      messageKey: "saved",
      payload: toWikiEditPayload(persisted.draft),
      showMessage: false,
    });
  };

  const requestPublication = () => {
    const nextDraft = getCurrentDraft();
    const payload = toWikiEditPayload(nextDraft);
    const savedCode = draftRef.current.source === initialDraft ? draftRef.current.code : initialCode;

    setSaveState({
      status: "submitting",
      messageKey: "submitting",
      payload,
      showMessage: true,
    });

    void Promise.resolve(submitAdapter(nextDraft)).then((adapterResult) => {
      const result: WikiPersistenceResult = isWikiPersistenceResult(adapterResult) ? adapterResult : { ok: false };

      if (draftRef.current.source !== initialDraft) return;
      if (result.ok) setPersisted({ draft: nextDraft, code: savedCode });

      setSaveState({
        status: result.ok ? "saved" : "failed",
        messageKey: result.ok ? "submitted" : "submitFailed",
        payload,
        showMessage: true,
      });

      if (result.ok) {
        onSubmitSuccess?.(result);
      }
    }).catch(() => {
      setSaveState({
        status: "failed",
        messageKey: "submitFailed",
        payload,
        showMessage: true,
      });
    });
  };

  return {
    hasUnsavedChanges,
    canPersist: !codeParseError,
    code,
    codeParseError,
    codeWarnings,
    draft,
    editingId,
    saveState: visibleSaveState,
    clearDraft,
    requestPublication,
    saveDraft,
    setEditingId: (
      nextEditingId: WikiContentEditorId | "basic" | "title" | null,
    ) => {
      setEditingId(nextEditingId);
      if (
        nextEditingId === null ||
        nextEditingId === "basic" ||
        nextEditingId === "title" ||
        nextEditingId !== newContentEditorId
      ) {
        setNewContentEditorId(null);
      }
    },
    cancelEditing: () => {
      if (editingId && editingId === newContentEditorId) {
        const [, identifier] = editingId.split(":");
        const currentDraft = getCurrentDraft();

        commitDraft({
          ...currentDraft,
          sections: deleteWikiContent(currentDraft.sections, identifier),
        });
        setNewContentEditorId(null);
        setEditingId(null);
        return;
      }

      setEditingId(null);
    },
    updateCode: (nextCode: string) => {
      if (nextCode.trimEnd() === persisted.code.trimEnd()) {
        commitDraft({ ...getCurrentDraft(), sections: persisted.draft.sections }, nextCode);
        return;
      }
      draftRef.current = { source: initialDraft, value: getCurrentDraft(), code: nextCode };
      setCode(nextCode);
      const parsed = parseWikiSectionsFromCode(nextCode);

      if (!parsed.ok) {
        setCodeParseError(parsed.code);
        setCodeWarnings([]);
        setSaveState({
          status: "dirty",
          messageKey: "dirty",
          payload: toWikiEditPayload(getCurrentDraft()),
          showMessage: true,
        });
        return;
      }

      const currentDraft = getCurrentDraft();
      commitDraft(
        {
          ...currentDraft,
          sections: parsed.sections,
        },
        nextCode,
      );
    },
    updateBasic: (basic: WikiDraftDetail["basic"]) => {
      const currentDraft = getCurrentDraft();
      commitDraft({
        ...currentDraft,
        basic,
        resourceType: basic.resourceType,
        slug: normalizeWikiSlugForResourceType(
          currentDraft.slug,
          basic.resourceType as WikiResourceType,
        ),
      });
    },
    updateHeroImage: (heroImage: WikiDraftDetail["heroImage"]) =>
      commitDraft({
        ...getCurrentDraft(),
        heroImage,
      }),
    updateSettings: (
      settings: Partial<Pick<WikiDraftDetail, "resourceType" | "slug" | "themeColor" | "title" | "metaDescription" | "keywords">>,
    ) => {
      const currentDraft = getCurrentDraft();
      const nextResourceType =
        (settings.resourceType as WikiResourceType | undefined) ??
        (currentDraft.resourceType as WikiResourceType);

      commitDraft({
        ...currentDraft,
        ...settings,
        title: settings.title !== undefined ? settings.title : currentDraft.title,
        metaDescription: settings.metaDescription !== undefined
          ? settings.metaDescription
          : currentDraft.metaDescription,
        keywords: settings.keywords !== undefined
          ? settings.keywords
          : currentDraft.keywords,
        resourceType: nextResourceType,
        basic: {
          ...currentDraft.basic,
          resourceType: nextResourceType,
        },
        slug: normalizeWikiSlugForResourceType(
          settings.slug ?? currentDraft.slug,
          nextResourceType,
        ),
      });
    },
    updateSection: (
      sectionIdentifier: string,
      changes: Parameters<typeof updateWikiSection>[2],
    ) => {
      const currentDraft = getCurrentDraft();
      commitDraft({
        ...currentDraft,
        sections: updateWikiSection(currentDraft.sections, sectionIdentifier, changes),
      });
      if (editingId === newContentEditorId) {
        setNewContentEditorId(null);
      }
    },
    updateBlock: (blockIdentifier: string, changes: Partial<WikiBlock>) => {
      const currentDraft = getCurrentDraft();
      commitDraft({
        ...currentDraft,
        sections: updateWikiBlock(currentDraft.sections, blockIdentifier, changes),
      });
      if (editingId === newContentEditorId) {
        setNewContentEditorId(null);
      }
    },
    addSection: (parentSectionIdentifier?: string) => {
      const currentDraft = getCurrentDraft();
      const [sections, nextEditingId] = addWikiSection(
        currentDraft.sections,
        parentSectionIdentifier,
      );

      commitDraft({
        ...currentDraft,
        sections,
      });
      setEditingId(nextEditingId);
      setNewContentEditorId(nextEditingId);
    },
    addBlock: (sectionIdentifier: string, blockType: WikiBlockType) => {
      const currentDraft = getCurrentDraft();
      const [sections, nextEditingId] = addWikiBlock(
        currentDraft.sections,
        sectionIdentifier,
        blockType,
      );

      commitDraft({
        ...currentDraft,
        sections,
      });
      setEditingId(nextEditingId);
      setNewContentEditorId(nextEditingId);
    },
    deleteContent: (identifier: string) => {
      const currentDraft = getCurrentDraft();
      commitDraft({
        ...currentDraft,
        sections: deleteWikiContent(currentDraft.sections, identifier),
      });
      setEditingId(null);
      setNewContentEditorId(null);
    },
  };
};
