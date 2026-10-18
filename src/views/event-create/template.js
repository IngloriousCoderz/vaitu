import micOutline from "@iconify-icons/material-symbols/mic-outline"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { FormActions } from "../../common/form-actions/index.js"
import { Page } from "../../common/page/index.js"
import {
  AUDIO_MAX_SECONDS,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
  ZERO,
} from "../../constants/index.js"
import { ITALY } from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"
import { categories, categoryById } from "../event-list/categories.js"
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
              error: getFieldError(entity, `details.${spec.field}`),
              onDetailField,
            }),
          )}
          ${
            title_is_derived
              ? ""
              : this.renderTextField({
                  label: t("fields.title"),
                  field: "title",
                  value: getFieldValue(entity, "title", ""),
                  placeholder: t("create.titleExample"),
                  error: getFieldError(entity, "title"),
                  isRequired: true,
                  onField,
                })
          }
          ${this.renderTextField({
            label: t("fields.location"),
            field: "location",
            value: getFieldValue(entity, "location", ""),
            placeholder: t("create.locationExample"),
            error: getFieldError(entity, "location"),
            isRequired: true,
            onField,
          })}
          <div class=${styles.field}>${api.render("country-create")}</div>
          ${
            country === ITALY
              ? html`
                  <div class=${styles.field}>
                    ${api.render("region-create")}
                  </div>
                `
              : this.renderTextField({
                  label: t("fields.region"),
                  field: "region",
                  value: getFieldValue(entity, "region", ""),
                  placeholder: t("create.regionExample"),
                  error: getFieldError(entity, "region"),
                  isRequired: true,
                  onField,
                })
          }
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
            error: getFieldError(entity, "event_date"),
            isRequired: true,
            onField,
          })}
          ${this.renderTextField({
            label: t("fields.deadline"),
            field: "application_deadline",
            value: getFieldValue(entity, "application_deadline", ""),
            type: "datetime-local",
            error: getFieldError(entity, "application_deadline"),
            isRequired: true,
            onField,
          })}
          ${this.renderTextField({
            label: t("fields.maxShortlist"),
            field: "max_applicants",
            value: getFieldValue(entity, "max_applicants", ""),
            type: "number",
            error: getFieldError(entity, "max_applicants"),
            isRequired: true,
            onField,
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
        ${
          entity.is_recording
            ? html`
                ${Flex.render({
                  element: "p",
                  align: "center",
                  gap: "sm",
                  className: styles.recording,
                  children: html`<span class=${styles.recDot}></span>
                    ${t("create.listening")}`,
                })}
                <p class=${styles.timer}>
                  ${formatElapsed(entity.audio_elapsed ?? ZERO)} /
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
              `
            : src
              ? html`
                  <audio controls src=${src} class=${styles.player}></audio>
                  ${
                    entity.is_transcribing
                      ? html`
                          <p class=${styles.transcribing}>
                            ${t("create.transcribing")}
                          </p>
                        `
                      : entity.is_parsing
                        ? html`
                            <p class=${styles.transcribing}>
                              ${t("create.filling")}
                            </p>
                          `
                        : entity.audio_transcript
                          ? html`
                              <p class=${styles.transcript}>
                                “${entity.audio_transcript}”
                              </p>
                            `
                          : ""
                  }
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
                `
              : html`
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
                `
        }
        ${ErrorAlert.render({
          error: entity.audio_error,
          className: styles.error,
        })}
        <p class=${styles.hint}>${t("create.voiceHint")}</p>
      `,
    })
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
