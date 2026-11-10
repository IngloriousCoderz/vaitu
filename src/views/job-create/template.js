import closeIcon from "@iconify-icons/material-symbols/close"
import micOutline from "@iconify-icons/material-symbols/mic-outline"
import { Button } from "@inglorious/ui/button"
import { ChipPicker } from "@inglorious/ui/chip-picker"
import { CropDialog } from "@inglorious/ui/crop-dialog"
import { Dialog } from "@inglorious/ui/dialog"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { Progress } from "@inglorious/ui/progress"
import { RadioGroup } from "@inglorious/ui/radio-group"
import { Select } from "@inglorious/ui/select"
import { Textarea } from "@inglorious/ui/textarea"
import { html, nothing } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { ErrorLabel } from "../../common/error-label/index.js"
import { FormActions } from "../../common/form-actions/index.js"
import { Page } from "../../common/page/index.js"
import { ProfessionRequest } from "../../common/profession-request/index.js"
import {
  AUDIO_MAX_SECONDS,
  COVER_IMAGES,
  MAX_JOB_IMAGES,
  NO_TIME_RECORDED,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
} from "../../constants/index.js"
import { CURRENCIES, DEFAULT_CURRENCY } from "../../data/currencies.js"
import { ITALY } from "../../data/regions/resolve.js"
import { currentLocale, t } from "../../i18n/index.js"
import { detailsFor, settingById } from "../job-list/job-settings.js"
import { COVER_CROPPER } from "./cover-cropper.js"
import styles from "./style.module.css"

const PAY_KINDS = ["to_agree", "fixed", "range", "unpaid"]

export const template = {
  render(props, api) {
    return this.renderJobCreate(props, api)
  },

  renderJobCreate(
    {
      entity,
      onField,
      onDetailField,
      onDetailToggle,
      onSave,
      onRecordStart,
      onRecordStop,
      onCancelAudio,
      onRemoveAudio,
      onVoiceWaitDismiss,
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
    const settingId = getFieldValue(entity, "setting", "wedding")
    const profession = getFieldValue(entity, "profession", "")
    const details = getFieldValue(entity, "details", {})
    const country = getFieldValue(entity, "country", "")
    const setting = settingById(settingId)
    const identityFields = setting.createFields.filter(
      (spec) => spec.section === "identity",
    )
    const title_is_derived = !setting.title_from.input

    return Page.render({
      variant: "document",
      read: true,
      setting: settingId,
      children: [
        this.renderVoiceWait({ entity, onVoiceWaitDismiss }),
        html`
          ${this.renderAudio({
            entity,
            onRecordStart,
            onRecordStop,
            onCancelAudio,
            onRemoveAudio,
          })}
          <div class=${styles.field}>${api.render("settingCreate")}</div>
          <div class=${styles.field}>
            ${api.render("jobTypeCreate")} ${ProfessionRequest.render()}
          </div>
          ${identityFields.map((spec) =>
            this.renderDetailField({
              spec,
              details,
              error: t(getFieldError(entity, `details.${spec.field}`)),
              onDetailField,
            }),
          )}
          ${when(!title_is_derived, () =>
            this.renderTextField({
              label: setting.titleLabel ?? t("fields.title"),
              field: "title",
              value: getFieldValue(entity, "title", ""),
              placeholder: setting.titlePlaceholder ?? t("create.titleExample"),
              error: t(getFieldError(entity, "title")),
              isRequired: true,
              onField,
            }),
          )}
          ${this.renderTextField({
            label: t("fields.location"),
            field: "location",
            value: getFieldValue(entity, "location", ""),
            placeholder:
              setting.locationPlaceholder ?? t("create.locationExample"),
            error: t(getFieldError(entity, "location")),
            isRequired: true,
            onField,
          })}
          <div class=${styles.field}>${api.render("countryCreate")}</div>
          ${when(
            country === ITALY,
            () => html`
              <div class=${styles.field}>${api.render("regionCreate")}</div>
            `,
            () =>
              this.renderTextField({
                label: t("fields.region"),
                field: "region",
                value: getFieldValue(entity, "region", ""),
                placeholder: t("create.regionExample"),
                error: t(getFieldError(entity, "region")),
                isRequired: true,
                onField,
              }),
          )}
          ${detailsFor({ setting: settingId, profession }).map(
            (detail) => html`
              <div class=${styles.field}>
                ${this.renderDetailChips({
                  detail,
                  value: getFieldValue(entity, `details.${detail.id}`, []),
                  error: getFieldError(entity, `details.${detail.id}`),
                  onDetailToggle,
                })}
              </div>
            `,
          )}
          ${this.renderTextField({
            label: t("fields.jobDate"),
            field: "job_date",
            value: getFieldValue(entity, "job_date", ""),
            type: "date",
            error: t(getFieldError(entity, "job_date")),
            isRequired: true,
            onField,
          })}
          ${this.renderTextField({
            label: t("fields.deadline"),
            field: "application_deadline",
            value: getFieldValue(entity, "application_deadline", ""),
            type: "datetime-local",
            error: t(getFieldError(entity, "application_deadline")),
            isRequired: true,
            onField,
          })}
          ${this.renderTextField({
            label: t("fields.shortlistSize"),
            hint: t("fields.shortlistSizeHint"),
            field: "max_applicants",
            value: getFieldValue(entity, "max_applicants", ""),
            type: "number",
            error: t(getFieldError(entity, "max_applicants")),
            isRequired: true,
            onField,
          })}
          ${this.renderPay({ entity, onField })}
          <div class=${styles.field}>
            ${Textarea.render({
              id: "create-description",
              label: t("fields.description"),
              hint: t("fields.descriptionHint"),
              value: getFieldValue(entity, "description", ""),
              error: t(getFieldError(entity, "description")),
              rows: 4,
              isAutoSize: true,
              isFullWidth: true,
              onChange: (value) => onField({ field: "description", value }),
            })}
          </div>
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
                : entity.editing_job_id
                  ? t("create.saveChanges")
                  : t("create.saveJob"),
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

  renderPay({ entity, onField }) {
    const kind = getFieldValue(entity, "pay_kind", "to_agree")
    const currency = getFieldValue(entity, "pay_currency", DEFAULT_CURRENCY)
    const currencyNames = new Intl.DisplayNames(currentLocale(), {
      type: "currency",
    })
    return html`
      <div class=${styles.field}>
        ${RadioGroup.render({
          id: "pay-kind",
          label: t("pay.title"),
          value: kind,
          options: PAY_KINDS.map((value) => ({
            value,
            label: t(`pay.kinds.${value}`),
          })),
          onChange: (value) => onField({ field: "pay_kind", value }),
        })}
        <p class=${styles.hint}>${t("pay.hint")}</p>
      </div>
      ${when(
        kind === "fixed" || kind === "range",
        () => html`
          ${this.renderTextField({
            label: kind === "range" ? t("pay.min") : t("pay.amount"),
            field: "pay_min",
            value: getFieldValue(entity, "pay_min", ""),
            type: "number",
            error: t(getFieldError(entity, "pay_min")),
            isRequired: true,
            onField,
          })}
          ${when(kind === "range", () =>
            this.renderTextField({
              label: t("pay.max"),
              field: "pay_max",
              value: getFieldValue(entity, "pay_max", ""),
              type: "number",
              error: t(getFieldError(entity, "pay_max")),
              isRequired: true,
              onField,
            }),
          )}
          <div class=${styles.field}>
            ${Select.render({
              id: "create-pay_currency",
              label: t("pay.currency"),
              value: currency,
              options: CURRENCIES.map((code) => ({
                value: code,
                label: `${code} · ${currencyNames.of(code)}`,
              })),
              isFullWidth: true,
              onChange: (value) => onField({ field: "pay_currency", value }),
            })}
          </div>
        `,
      )}
    `
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

  renderVoiceWait({ entity, onVoiceWaitDismiss }) {
    return Dialog.render({
      id: "voice-wait",
      isOpen:
        (entity.is_transcribing || entity.is_parsing) &&
        !entity.is_voice_wait_dismissed,
      size: "sm",
      children: Flex.render({
        direction: "column",
        align: "center",
        gap: "md",
        className: styles.voiceWait,
        children: html`
          ${Progress.render({
            variant: "circular",
            color: "primary",
            ariaLabel: t("create.voice"),
          })}
          <p class=${styles.voiceWaitStep} role="status">
            ${
              entity.is_transcribing
                ? t("create.transcribing")
                : t("create.filling")
            }
          </p>
          <p class=${styles.transcribing}>${t("create.voiceWaitHint")}</p>
        `,
      }),
      actions: Button.render({
        children: t("create.fillMyself"),
        variant: "outline",
        shape: "pill",
        size: "md",
        isFullWidth: true,
        onClick: onVoiceWaitDismiss,
      }),
    })
  },

  renderAudio({
    entity,
    onRecordStart,
    onRecordStop,
    onCancelAudio,
    onRemoveAudio,
  }) {
    const src = entity.audio_preview_url
    if (
      !entity.is_audio_open &&
      !entity.is_recording &&
      !entity.is_transcribing &&
      !entity.is_parsing &&
      !entity.audio_preview_url &&
      !entity.audio_error
    )
      return nothing
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
    const galleryMax = MAX_JOB_IMAGES - COVER_IMAGES
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
    if (!entity.isCropOpen) return nothing
    return CropDialog.render(
      {
        cropperId: COVER_CROPPER,
        title: t("create.cropTitle"),
        description: t("create.cropHint"),
        applyLabel: t("create.cropApply"),
        cancelLabel: t("common.cancel"),
        savingLabel: t("common.saving"),
        closeLabel: t("common.close"),
        loadErrorText: t("errors.imageCrop"),
        error: t(entity.cropError),
        isOpen: true,
        isSaving: entity.isCropSaving,
        onCancel: onCropCancel,
        onApply: onCropConfirm,
      },
      api,
    )
  },

  renderDetailChips({ detail, value, error, onDetailToggle }) {
    return html`
      ${ChipPicker.render({
        label: detail.label,
        options: detail.options.map((option) => ({
          value: option.value,
          label: t(option.label),
        })),
        value,
        onToggle: (picked) =>
          onDetailToggle({ field: detail.id, value: picked }),
      })}
      ${ErrorLabel.render({ error })}
    `
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
    hint,
    type,
    error,
    isRequired = false,
    onField,
  }) {
    return html`
      <div class=${styles.field}>
        ${Input.render({
          id: `create-${field}`,
          label,
          inputType: type ?? "text",
          value,
          placeholder,
          hint,
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
