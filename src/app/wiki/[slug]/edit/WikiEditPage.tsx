"use client";

import { useId, useState } from "react";
import { type WikiDetail } from "@kpool/wiki";

import {
  type WikiEditorMode,
  type WikiPreviewMode,
  WikiBasicPanel,
  WikiCodeEditor,
  WikiEditSidebar,
  WikiHeroBasicFlipCard,
  WikiHeroPanel,
  WikiSectionEditor,
  WikiStatePanel,
  cardSurfaceStyle,
  mainBackgroundStyle,
} from "../../../../components/Wiki";
import { getWikiResourceLabel, type WikiResourceType } from "../../wikiRouting";
import { buildWikiThemeCssVariables } from "../wikiThemePalette";
import { type loadDraftWikiState } from "../../draftWiki";
import { useWikiEditDraft } from "./useWikiEditDraft";

type WikiEditPageProps = {
  language: string;
  slug: string;
  themeColor?: string;
  wikiState: Awaited<ReturnType<typeof loadDraftWikiState>>;
};

function WikiEditContent({ data, language }: { data: WikiDetail; language: string }) {
  const flipCardId = useId();
  const [isBasicFlipped, setIsBasicFlipped] = useState(false);
  const [editorMode, setEditorMode] = useState<WikiEditorMode>("gui");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState<WikiPreviewMode>("light");
  const {
    canPersist,
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
    updateCode,
    updateBasic,
    updateHeroImage,
    updateSettings,
    updateSection,
    updateBlock,
    addSection,
    addBlock,
    deleteContent,
  } = useWikiEditDraft(data);
  const resourceLabel = getWikiResourceLabel(draft.resourceType as WikiResourceType);
  const themeStyles = buildWikiThemeCssVariables(draft.themeColor);
  const themeLabel = draft.themeColor?.toUpperCase();
  const closeEditor = () => setEditingId(null);
  const editHeroImage = () => {
    setIsBasicFlipped(false);
    setEditingId("hero");
  };
  const editBasic = () => {
    setIsBasicFlipped(true);
    setEditingId("basic");
  };
  const isBusy = saveState.status === "saving" || saveState.status === "submitting";
  const clearChanges = () => {
    if (!window.confirm("Discard unsaved wiki changes?")) {
      return;
    }

    setIsBasicFlipped(false);
    clearDraft();
  };

  return (
    <main
      className="wiki-theme-scope min-h-screen px-5 py-6 text-text-strong sm:px-8 sm:py-10"
      data-theme={previewMode}
      data-testid="wiki-edit-root"
      style={{
        ...themeStyles,
        ...mainBackgroundStyle,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-text-strong lg:text-5xl">
              {draft.basic.name}
            </h1>
          </div>
        </header>

        <div className="flex min-w-0 flex-col gap-8">
          {themeLabel ? (
            <div>
              <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]" data-testid="wiki-edit-theme-badge" style={cardSurfaceStyle}>
                Theme {themeLabel}
              </span>
            </div>
          ) : null}

          <section>
            <WikiHeroBasicFlipCard
              basic={draft.basic}
              flipCardId={flipCardId}
              heroImage={draft.heroImage}
              isBasicEditing={editingId === "basic"}
              isFlipped={isBasicFlipped}
              isHeroEditing={editingId === "hero"}
              onCancel={closeEditor}
              onEditBasic={editBasic}
              onEditHero={editHeroImage}
              onFlipChange={setIsBasicFlipped}
              onSaveBasic={(basic) => {
                updateBasic(basic);
                closeEditor();
              }}
              profileLabel={`${resourceLabel} profile`}
              onSaveHero={(heroImage) => {
                updateHeroImage(heroImage);
                closeEditor();
              }}
            />
            <div className="hidden gap-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
              <WikiHeroPanel
                heroImage={draft.heroImage}
                isEditing={editingId === "hero"}
                onCancel={closeEditor}
                onEdit={editHeroImage}
                onSave={(heroImage) => {
                  updateHeroImage(heroImage);
                  closeEditor();
                }}
              />
              <WikiBasicPanel
                basic={draft.basic}
                isEditing={editingId === "basic"}
                onCancel={closeEditor}
                onEdit={editBasic}
                onSave={(basic) => {
                  updateBasic(basic);
                  closeEditor();
                }}
              />
            </div>
          </section>

          {editorMode === "gui" ? (
            <section className="space-y-5">
              {draft.sections.map((section) => (
                <WikiSectionEditor
                  editingId={editingId}
                  key={section.sectionIdentifier}
                  language={language}
                  onAddBlock={addBlock}
                  onAddSection={addSection}
                  onCancel={closeEditor}
                  onDeleteContent={deleteContent}
                  onEdit={setEditingId}
                  onSaveBlock={(blockIdentifier, changes) => {
                    updateBlock(blockIdentifier, changes);
                    closeEditor();
                  }}
                  onSaveSection={(sectionIdentifier, changes) => {
                    updateSection(sectionIdentifier, changes);
                    closeEditor();
                  }}
                  section={section}
                />
              ))}
              <button
                className="w-full rounded-[1.5rem] border border-dashed border-stroke-subtle p-5 text-sm font-semibold uppercase tracking-[0.18em] text-text-muted"
                onClick={() => addSection()}
                style={cardSurfaceStyle}
                type="button"
              >
                + Section
              </button>
            </section>
          ) : (
            <WikiCodeEditor
              code={code}
              errorMessage={codeParseError}
              warnings={codeWarnings}
              onChange={updateCode}
              onClear={clearChanges}
            />
          )}
        </div>

        <WikiEditSidebar
          canPersist={canPersist}
          editorMode={editorMode}
          isBusy={isBusy}
          isOpen={isSidebarOpen}
          onEditorModeChange={setEditorMode}
          onClear={clearChanges}
          onPreviewModeChange={setPreviewMode}
          onSave={saveDraft}
          onSubmit={requestPublication}
          onToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
          onUpdateSettings={updateSettings}
          previewMode={previewMode}
          resourceType={draft.resourceType}
          slug={draft.slug}
          themeColor={draft.themeColor}
        />
      </div>
    </main>
  );
}

export function WikiEditPage({ language, themeColor, wikiState }: WikiEditPageProps) {
  if (wikiState.status === "error") {
    return <WikiStatePanel message={wikiState.message} title="Unable to load wiki" tone="danger" />;
  }

  if (wikiState.status === "empty") {
    return (
      <WikiStatePanel
        message="This resource does not have a wiki draft to edit at the moment."
        title="No wiki draft"
      />
    );
  }

  return (
    <WikiEditContent
      data={{
        ...wikiState.data,
        themeColor: themeColor ?? wikiState.data.themeColor,
      }}
      language={language}
    />
  );
}
