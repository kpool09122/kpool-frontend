import { useLayoutEffect, useRef } from "react";
import { act, renderHook } from "@testing-library/react";
import {
  createMockWikiDetail,
  normalizeWikiSectionsForEditing,
  serializeWikiSectionsToCode,
  toWikiEditPayload,
} from "@kpool/wiki";
import { describe, expect, it, vi } from "vitest";

import { useWikiEditDraft } from "./useWikiEditDraft";

describe("useWikiEditDraft", () => {
  it("preserves edits when the loaded wiki has not changed", () => {
    const wiki = createMockWikiDetail("gr-aurora-echo");
    const { result, rerender } = renderHook(
      ({ wiki }) => useWikiEditDraft(wiki),
      { initialProps: { wiki } },
    );

    act(() => {
      result.current.updateSettings({ title: "Edited title" });
      result.current.setEditingId("title");
    });
    rerender({ wiki });

    expect(result.current.draft.title).toBe("Edited title");
    expect(result.current.editingId).toBe("title");
    expect(result.current.saveState.status).toBe("dirty");
  });

  it("resets editing state and saves the refreshed wiki", async () => {
    const wiki = createMockWikiDetail("gr-aurora-echo");
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
    const { result, rerender } = renderHook(
      ({ wiki }) => useWikiEditDraft(wiki, { saveAdapter }),
      { initialProps: { wiki } },
    );

    act(() => {
      result.current.addSection();
      result.current.updateCode("{ invalid JSON");
    });
    expect(result.current.codeParseError).not.toBeNull();
    expect(result.current.editingId).not.toBeNull();

    const refreshedWiki = { ...wiki, title: "Refreshed title" };
    const expectedDraft = {
      ...refreshedWiki,
      sections: normalizeWikiSectionsForEditing(refreshedWiki.sections),
    };
    rerender({ wiki: refreshedWiki });

    expect(result.current.draft).toEqual(expectedDraft);
    expect(result.current.code).toBe(serializeWikiSectionsToCode(expectedDraft.sections));
    expect(result.current.codeParseError).toBeNull();
    expect(result.current.canPersist).toBe(true);
    expect(result.current.editingId).toBeNull();
    expect(result.current.saveState).toEqual({
      status: "saved",
      messageKey: "saved",
      payload: toWikiEditPayload(expectedDraft),
      showMessage: false,
    });

    await act(async () => {
      result.current.saveDraft();
    });
    expect(saveAdapter).toHaveBeenCalledWith(expectedDraft);

    act(() => {
      result.current.setEditingId("title");
      result.current.cancelEditing();
    });
    expect(result.current.draft.sections).toEqual(expectedDraft.sections);
  });

  it.each(["saveDraft", "requestPublication"] as const)(
    "uses the refreshed wiki for %s before passive effects run",
    (action) => {
      const wiki = createMockWikiDetail("gr-aurora-echo");
      const adapter = vi.fn().mockResolvedValue({ ok: true });
      const { rerender } = renderHook(({ wiki }) => {
        const editor = useWikiEditDraft(wiki, {
          saveAdapter: adapter,
          submitAdapter: adapter,
        });
        const previousWiki = useRef(wiki);

        useLayoutEffect(() => {
          if (previousWiki.current !== wiki) {
            previousWiki.current = wiki;
            editor[action]();
          }
        }, [editor, wiki]);

        return editor;
      }, { initialProps: { wiki } });

      const refreshedWiki = { ...wiki, title: "Refreshed title" };
      rerender({ wiki: refreshedWiki });

      expect(adapter).toHaveBeenCalledTimes(1);
      expect(adapter.mock.calls[0][0].title).toBe("Refreshed title");
    },
  );

  it("updates the refreshed wiki and saves consecutive changes in one callback", () => {
    const wiki = createMockWikiDetail("gr-aurora-echo");
    const saveAdapter = vi.fn().mockResolvedValue({ ok: true });
    const { result, rerender } = renderHook(({ wiki }) => {
      const editor = useWikiEditDraft(wiki, { saveAdapter });
      const previousWiki = useRef(wiki);

      useLayoutEffect(() => {
        if (previousWiki.current !== wiki) {
          previousWiki.current = wiki;
          editor.updateSettings({ metaDescription: "Updated description" });
          editor.updateSettings({ keywords: ["Updated keywords"] });
          editor.saveDraft();
        }
      }, [editor, wiki]);

      return editor;
    }, { initialProps: { wiki } });

    rerender({ wiki: { ...wiki, title: "Refreshed title" } });

    expect(saveAdapter).toHaveBeenCalledTimes(1);
    expect(saveAdapter.mock.calls[0][0]).toMatchObject({
      title: "Refreshed title",
      metaDescription: "Updated description",
      keywords: ["Updated keywords"],
    });
    expect(result.current.draft).toMatchObject({
      title: "Refreshed title",
      metaDescription: "Updated description",
      keywords: ["Updated keywords"],
    });
  });

});

it("tracks unsaved changes through failures, successful saves, and changes made during saving", async () => {
  const wiki = createMockWikiDetail("gr-aurora-echo");
  let finishSave: (value: { ok: boolean }) => void = () => {};
  const saveAdapter = vi.fn(() => new Promise((resolve) => { finishSave = resolve; }));
  const { result } = renderHook(() => useWikiEditDraft(wiki, { saveAdapter }));
  expect(result.current.hasUnsavedChanges).toBe(false);
  act(() => result.current.updateSettings({ title: "First edit" }));
  expect(result.current.hasUnsavedChanges).toBe(true);
  act(() => result.current.saveDraft());
  await act(async () => { finishSave({ ok: false }); });
  expect(result.current.hasUnsavedChanges).toBe(true);
  act(() => result.current.saveDraft());
  act(() => result.current.updateSettings({ title: "Second edit" }));
  await act(async () => { finishSave({ ok: true }); });
  expect(result.current.hasUnsavedChanges).toBe(true);
  expect(result.current.saveState.status).toBe("dirty");
  act(() => result.current.saveDraft());
  await act(async () => { finishSave({ ok: true }); });
  expect(result.current.hasUnsavedChanges).toBe(false);
  act(() => result.current.updateCode("invalid Wiki code"));
  expect(result.current.hasUnsavedChanges).toBe(true);
  act(() => result.current.clearDraft());
  expect(result.current.hasUnsavedChanges).toBe(false);
  expect(result.current.draft.title).toBe("Second edit");
});

it("marks code saved when updating the draft and saving in the same callback", async () => {
  const wiki = createMockWikiDetail("gr-aurora-echo");
  const { result } = renderHook(() => useWikiEditDraft(wiki));
  await act(async () => {
    result.current.addSection();
    result.current.saveDraft();
  });
  expect(result.current.hasUnsavedChanges).toBe(false);
});

it("clears the dirty message when changes return to the last persisted data", async () => {
  const wiki = createMockWikiDetail("gr-aurora-echo");
  const { result } = renderHook(() => useWikiEditDraft(wiki));
  act(() => result.current.updateSettings({ themeColor: "#123456" }));
  expect(result.current.saveState.messageKey).toBe("dirty");
  act(() => result.current.updateSettings({ themeColor: wiki.themeColor }));
  expect(result.current.hasUnsavedChanges).toBe(false);
  expect(result.current.saveState).toMatchObject({ status: "saved", showMessage: false });
  act(() => result.current.updateSettings({ themeColor: "#123456" }));
  await act(async () => result.current.saveDraft());
  act(() => result.current.updateSettings({ themeColor: "#654321" }));
  act(() => result.current.updateSettings({ themeColor: "#123456" }));
  expect(result.current.hasUnsavedChanges).toBe(false);
  expect(result.current.saveState).toMatchObject({ status: "saved", showMessage: false });
});

it("clears unsaved changes when a newly added section is cancelled", () => {
  const wiki = createMockWikiDetail("gr-aurora-echo");
  const { result } = renderHook(() => useWikiEditDraft(wiki));
  act(() => result.current.addSection());
  expect(result.current.hasUnsavedChanges).toBe(true);
  act(() => result.current.cancelEditing());
  expect(result.current.hasUnsavedChanges).toBe(false);
  expect(result.current.saveState.showMessage).toBe(false);
});

it("compares valid code by its data and clears changes when invalid code is restored", () => {
  const wiki = createMockWikiDetail("gr-aurora-echo");
  const { result } = renderHook(() => useWikiEditDraft(wiki));
  const originalCode = result.current.code;
  act(() => result.current.updateCode(`${originalCode}\n\n`));
  expect(result.current.hasUnsavedChanges).toBe(false);
  act(() => result.current.updateCode("invalid code"));
  expect(result.current.hasUnsavedChanges).toBe(true);
  act(() => result.current.updateCode(originalCode));
  expect(result.current.hasUnsavedChanges).toBe(false);
  expect(result.current.saveState.showMessage).toBe(false);
});
