import closeIcon from "@iconify-icons/material-symbols/close"
import micOutline from "@iconify-icons/material-symbols/mic-outline"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { CropDialog } from "../../common/crop-dialog/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { FormActions } from "../../common/form-actions/index.js"
import { Page } from "../../common/page/index.js"
import {
  AUDIO_MAX_SECONDS,
  COVER_IMAGES,
  MAX_EVENT_IMAGES,
  NO_TIME_RECORDED,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
} from "../../constants/index.js"
import { ITALY } from "../../data/regions/resolve.js"
import { t, translated } from "../../i18n/index.js"
import { categories, categoryById } from "../event-list/categories.js"
import { COVER_CROPPER } from "./cover-cropper.js"
import styles from "./style.module.css"

export const EventCreate = {
  render(props, api) {
    return this.renderEventCreate(props, api)
  },

  renderEventCreate(
    {
      entity,
      onField,
      onDetailField,
      onCategory,
      onSave,
      onRecordStart,
      onRecordStop,
      onCancelAudio,
      onRemoveAudio,
      onImagesAdd,
      onImageRemove,
      onCoverSelect,
      onCoverEdit,
      onCropCancel,
      onCropConfirm,
    },
    api,
  ) {
    const busy = entity.status === "saving"
    const categoryId = getFieldValue(entity, "category", "wedding")
    const details = getFieldValue(entity, "details", {})
    const country = getFieldValue(entity, "country", "")
    const category = categoryById(categoryId)
    const identityFields = category.createFields.filter(
      (spec) => spec.section === "identity",
    )
    const title_is_derived = !category.title_from.input

    return Page.render({
      variant: "document",
      read: true,
      category: categoryId,
      children: [
        html`
          ${this.renderAudio({
            entity,
            onRecordStart,
            onRecordStop,
            onCancelAudio,
            onRemoveAudio,
          })}
          ${Flex.render({
            className: styles.chips,
            children: categories.map(
              (category) => html`
                <button
                  type="button"
                  class=${styles.chipButton}
                  @click=${() => onCategory(category.id)}
                >
                  ${Chip.render({
                    children: category.label,
                    color: category.id === categoryId ? "primary" : "default",
                  })}
                </button>
              `,
            ),
          })}
          ${identityFields.map((spec) =>
            this.renderDetailField({
              spec,
              details,
              error: translated(getFieldError(entity, `details.${spec.field}`)),
              onDetailField,
            }),
          )}
          ${when(!title_is_derived, () =>
            this.renderTextField({
              label: t("fields.title"),
              field: "title",
              value: getFieldValue(entity, "title", ""),
              placeholder: t("create.titleExample"),
              error: translated(getFieldError(entity, "title")),
              isRequired: true,
              onField,
            }),
          )}
          ${this.renderTextField({
            label: t("fields.location"),
            field: "location",
            value: getFieldValue(entity, "location", ""),
            placeholder: t("create.locationExample"),
            error: translated(getFieldError(entity, "location")),
            isRequired: true,
            onField,
          })}
          <div class=${styles.field}>${api.render("country-create")}</div>
          ${when(
            country === ITALY,
            () => html`
              <div class=${styles.field}>${api.render("region-create")}</div>
            `,
            () =>
              this.renderTextField({
                label: t("fields.region"),
                field: "region",
                value: getFieldValue(entity, "region", ""),
                placeholder: t("create.regionExample"),
                error: translated(getFieldError(entity, "region")),
                isRequired: true,
                onField,
              }),
          )}
          <div class=${styles.field}>
            ${api.render(
              categoryId === "festival" ? "genre-create" : "style-create",
            )}
          </div>
          ${this.renderTextField({
            label: t("fields.eventDate"),
            field: "event_date",
            value: getFieldValue(entity, "event_date", ""),
            type: "date",
            error: translated(getFieldError(entity, "event_date")),
            isRequired: true,
            onField,
          })}
          ${this.renderTextField({
            label: t("fields.deadline"),
            field: "application_deadline",
            value: getFieldValue(entity, "application_deadline", ""),
            type: "datetime-local",
            error: translated(getFieldError(entity, "application_deadline")),
            isRequired: true,
            onField,
          })}
          ${this.renderTextField({
            label: t("fields.maxShortlist"),
            field: "max_applicants",
            value: getFieldValue(entity, "max_applicants", ""),
            type: "number",
            error: translated(getFieldError(entity, "max_applicants")),
            isRequired: true,
            onField,
          })}
          ${this.renderImages({
            entity,
            busy,
            onImagesAdd,
            onImageRemove,
            onCoverSelect,
            onCoverEdit,
          })}
          ${ErrorAlert.render({
            error: entity.image_error,
            className: styles.error,
          })}
          ${ErrorAlert.render({ error: entity.error, className: styles.error })}
          ${FormActions.render({
            children: Button.render({
              children: busy
                ? t("common.saving")
                : entity.editing_event_id
                  ? t("create.saveChanges")
                  : t("create.saveEvent"),
              color: "primary",
              shape: "pill",
              size: "md",
              isFullWidth: true,
              isDisabled: busy,
              onClick: onSave,
            }),
          })}
          ${this.renderCoverCrop({
            entity,
            api,
            onCropCancel,
            onCropConfirm,
          })}
        `,
      ],
    })
  },

  renderHeaderActions({ entity, onRecordStop, onOpenAudio }) {
    return IconButton.render({
      icon: Icon.render({ icon: micOutline, size: "lg" }),
      ariaLabel: t("create.voice"),
      color: "primary",
      shape: "round",
      onClick: entity.is_recording ? onRecordStop : onOpenAudio,
    })
  },

  renderAudio({
    entity,
    onRecordStart,
    onRecordStop,
    onCancelAudio,
    onRemoveAudio,
  }) {
    const src = entity.audio_preview_url ?? entity.audio_url
    // Edit mode with saved audio stays mic-only until tapped: a fresh take
    // (preview) always shows, saved audio alone does not.
    if (
      !entity.is_audio_open &&
      !entity.is_recording &&
      !entity.is_transcribing &&
      !entity.is_parsing &&
      !entity.audio_preview_url &&
      !entity.audio_error
    )
      return ""
    return Flex.render({
      direction: "column",
      className: styles.audioBox,
      children: html`
        <span class=${styles.audioLabel}>${t("create.voice")}</span>
        ${when(
          entity.is_recording,
          () => html`
            ${Flex.render({
              element: "p",
              align: "center",
              gap: "sm",
              className: styles.recording,
              children: html`<span class=${styles.recDot}></span>
                ${t("create.listening")}`,
            })}
            <p class=${styles.timer}>
              ${formatElapsed(entity.audio_elapsed ?? NO_TIME_RECORDED)} /
              ${formatElapsed(AUDIO_MAX_SECONDS)}
            </p>
            ${Button.render({
              children: t("create.stop"),
              variant: "outline",
              shape: "pill",
              size: "md",
              isFullWidth: true,
              onClick: onRecordStop,
            })}
            ${Button.render({
              children: t("common.cancel"),
              variant: "ghost",
              color: "default",
              size: "sm",
              className: styles.cancelButton,
              onClick: onCancelAudio,
            })}
          `,
          () =>
            when(
              src,
              () => html`
                <audio controls src=${src} class=${styles.player}></audio>
                ${when(
                  entity.is_transcribing,
                  () => html`
                    <p class=${styles.transcribing}>
                      ${t("create.transcribing")}
                    </p>
                  `,
                  () =>
                    when(
                      entity.is_parsing,
                      () => html`
                        <p class=${styles.transcribing}>
                          ${t("create.filling")}
                        </p>
                      `,
                      () =>
                        when(
                          entity.audio_transcript,
                          () => html`
                            <p class=${styles.transcript}>
                              “${entity.audio_transcript}”
                            </p>
                          `,
                        ),
                    ),
                )}
                ${Flex.render({
                  direction: "column",
                  gap: "sm",
                  className: styles.audioActions,
                  children: [
                    Button.render({
                      children: t("create.recordAgain"),
                      variant: "outline",
                      shape: "pill",
                      size: "md",
                      isFullWidth: true,
                      onClick: onRecordStart,
                    }),
                    Button.render({
                      children: t("create.remove"),
                      variant: "outline",
                      shape: "pill",
                      size: "md",
                      isFullWidth: true,
                      onClick: onRemoveAudio,
                    }),
                  ],
                })}
              `,
              () => html`
                ${Button.render({
                  children: t("create.start"),
                  color: "primary",
                  shape: "pill",
                  size: "md",
                  isFullWidth: true,
                  onClick: onRecordStart,
                })}
                ${Button.render({
                  children: t("common.cancel"),
                  variant: "ghost",
                  color: "default",
                  size: "sm",
                  className: styles.cancelButton,
                  onClick: onCancelAudio,
                })}
              `,
            ),
        )}
        ${ErrorAlert.render({
          error: entity.audio_error,
          className: styles.error,
        })}
        <p class=${styles.hint}>${t("create.voiceHint")}</p>
      `,
    })
  },

  renderImages({
    entity,
    busy,
    onImagesAdd,
    onImageRemove,
    onCoverSelect,
    onCoverEdit,
  }) {
    const coverSrc = entity.pending_cover?.previewUrl ?? entity.cover_url
    const galleryMax = MAX_EVENT_IMAGES - COVER_IMAGES
    const gallerySaved = entity.gallery_urls ?? []
    const galleryPending = entity.pending_gallery ?? []
    const galleryCount = gallerySaved.length + galleryPending.length
    return html`<div class=${styles.photos}>
      <span class=${styles.audioLabel}>${t("create.coverPhoto")}</span>
      <p class=${styles.photoHint}>${t("create.coverHint")}</p>
      ${when(coverSrc, () =>
        this.renderPhoto({
          src: coverSrc,
          className: styles.coverPhoto,
          onEdit: onCoverEdit,
          onRemove: () =>
            onImageRemove(
              entity.pending_cover
                ? { id: entity.pending_cover.id, slot: "cover" }
                : { url: entity.cover_url, slot: "cover" },
            ),
          isDisabled: busy,
        }),
      )}
      ${Button.render({
        children: coverSrc ? t("create.changeCover") : t("create.addCover"),
        variant: "outline",
        shape: "pill",
        size: "md",
        isFullWidth: true,
        isDisabled: busy,
        accept: "image/jpeg,image/png,image/webp",
        onFileSelect: ([file]) => onCoverSelect(file),
      })}
      <span class="${styles.audioLabel} ${styles.galleryLabel}"
        >${t("create.gallery")}</span
      >
      <p class=${styles.photoHint}>
        ${t("create.galleryHint", { count: galleryMax })}
      </p>
      ${when(galleryCount, () =>
        Flex.render({
          gap: "sm",
          wrap: "wrap",
          children: [
            ...gallerySaved.map((url) =>
              this.renderPhoto({
                src: url,
                onRemove: () => onImageRemove({ url, slot: "gallery" }),
                isDisabled: busy,
              }),
            ),
            ...galleryPending.map((photo) =>
              this.renderPhoto({
                src: photo.previewUrl,
                onRemove: () =>
                  onImageRemove({ id: photo.id, slot: "gallery" }),
                isDisabled: busy,
              }),
            ),
          ],
        }),
      )}
      ${Button.render({
        children: t("create.addGalleryPhotos"),
        variant: "outline",
        shape: "pill",
        size: "md",
        isFullWidth: true,
        isDisabled: busy || galleryCount >= galleryMax,
        accept: "image/jpeg,image/png,image/webp",
        isMultiple: true,
        onFileSelect: (files) => onImagesAdd({ files: [...files] }),
      })}
    </div>`
  },

  renderPhoto({ src, onRemove, onEdit, isDisabled, className = styles.photo }) {
    return html`<div class=${className}>
      ${when(
        onEdit,
        () =>
          html`<button
            type="button"
            class=${styles.photoEdit}
            ?disabled=${isDisabled}
            aria-label=${t("create.editCover")}
            @click=${onEdit}
          >
            <img class=${styles.photoImage} src=${src} alt="" />
          </button>`,
        () => html`<img class=${styles.photoImage} src=${src} alt="" />`,
      )}
      ${IconButton.render({
        icon: Icon.render({ icon: closeIcon, size: "sm" }),
        variant: "ghost",
        color: "secondary",
        shape: "round",
        ariaLabel: t("create.remove"),
        isDisabled,
        className: styles.photoRemove,
        onClick: onRemove,
      })}
    </div>`
  },

  renderCoverCrop({ entity, api, onCropCancel, onCropConfirm }) {
    if (!entity.isCropOpen) return ""
    return CropDialog.render(
      {
        cropperId: COVER_CROPPER,
        title: t("create.cropTitle"),
        description: t("create.cropHint"),
        applyLabel: t("create.cropApply"),
        error: entity.cropError,
        isSaving: entity.isCropSaving,
        onCancel: onCropCancel,
        onApply: onCropConfirm,
      },
      api,
    )
  },

  renderDetailField({ spec, details, error, onDetailField }) {
    return this.renderTextField({
      label: spec.label,
      field: spec.field,
      value: details[spec.field],
      error,
      isRequired: spec.isRequired,
      onField: ({ field, value }) => onDetailField({ field, value }),
    })
  },

  renderTextField({
    label,
    field,
    value = "",
    placeholder = "",
    type,
    error,
    isRequired = false,
    onField,
  }) {
    return html`
      <div class=${styles.field}>
        ${Input.render({
          // Stable so the label is bound to the input rather than just sitting
          // next to it.
          id: `create-${field}`,
          label,
          inputType: type ?? "text",
          value,
          placeholder,
          isRequired,
          isFullWidth: true,
          error,
          onChange: (next) => onField({ field, value: next }),
        })}
      </div>
    `
  },
}

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = String(totalSeconds % SECONDS_PER_MINUTE).padStart(
    PAD_LENGTH,
    "0",
  )
  return `${minutes}:${seconds}`
}
