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
      message: "Saved",
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
});
