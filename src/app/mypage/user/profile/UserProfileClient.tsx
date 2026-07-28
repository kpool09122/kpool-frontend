"use client";

import Image from "next/image";

import { ImageCropper } from "../../../../components/ImageCropper";
import { wikiImageAcceptAttribute } from "@kpool/wiki";
import { useUserSection } from "../UserSectionContext";

export function UserProfileClient() {
  const {
    currentIdentity,
    settingsState,
    t,
    onProfileImageChange,
    onProfileImageCropCancel,
    onProfileImageCropConfirm,
    onProfileImageCropError,
    onProfileImageDelete,
    onSave,
    onUpdateField,
  } = useUserSection();
  const profileImageSrc = settingsState.imagePreview;

  return (
    <section className="mt-5 rounded-lg border border-stroke-subtle bg-surface-raised p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t.profileSettingsTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">{t.profileSettingsDescription}</p>
        </div>
        <button
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={settingsState.isSaving || !currentIdentity}
          onClick={onSave}
          type="button"
        >
          {settingsState.isSaving ? t.identitySettingsSaving : t.identitySettingsSave}
        </button>
      </div>
      <div className="mt-5 grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">
          {t.profileIdentityNameLabel}
          <input
            className="rounded-lg border border-stroke-subtle bg-surface-base px-3 py-2"
            disabled={settingsState.isSaving || !currentIdentity}
            onChange={(event) => onUpdateField("identityName", event.currentTarget.value)}
            value={settingsState.identityName}
          />
        </label>
        <div className="grid gap-3 text-sm font-semibold">
          <span>{t.profileImageLabel}</span>
          <div className="flex flex-wrap items-center gap-4">
            <label
              className="group relative grid size-28 cursor-pointer place-items-center overflow-hidden rounded-full border border-stroke-subtle bg-surface-base transition hover:ring-4 hover:ring-brand-highlight/30 focus-within:ring-4 focus-within:ring-brand-highlight/40"
              title={t.profileImageSelect}
            >
              {profileImageSrc ? (
                <Image
                  alt={t.profileImagePreviewAlt}
                  className="size-full object-cover transition group-hover:brightness-90"
                  height={112}
                  src={profileImageSrc}
                  unoptimized
                  width={112}
                />
              ) : (
                <span className="grid size-full place-items-center border border-dashed border-stroke-subtle text-xs text-text-muted">
                  {t.profileImageEmpty}
                </span>
              )}
              <span className="sr-only">{t.profileImageSelect}</span>
              <input
                aria-label={t.profileImageSelect}
                accept={wikiImageAcceptAttribute}
                className="sr-only"
                disabled={settingsState.isSaving || !currentIdentity}
                onChange={(event) => {
                  onProfileImageChange(event.currentTarget.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
            {profileImageSrc ? (
              <button
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={settingsState.isSaving || !currentIdentity}
                onClick={onProfileImageDelete}
                type="button"
              >
                {t.profileImageDelete}
              </button>
            ) : null}
          </div>
          {settingsState.imageCropState ? (
            <ImageCropper
              aspect={1}
              disabled={settingsState.isSaving || !currentIdentity}
              sourceDataUrl={settingsState.imageCropState.sourceDataUrl}
              t={t.profileImageCropper}
              onCancel={onProfileImageCropCancel}
              onConfirm={onProfileImageCropConfirm}
              onError={onProfileImageCropError}
            />
          ) : null}
        </div>
        {settingsState.error ? (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
            {settingsState.error}
          </p>
        ) : null}
        {settingsState.syncError ? (
          <p className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800" role="alert">
            {settingsState.syncError}
          </p>
        ) : null}
        {settingsState.success ? (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">
            {settingsState.success}
          </p>
        ) : null}
      </div>
    </section>
  );
}
