import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { ErrorAlert } from "../../common/error-alert/index.js"
import { Page } from "../../common/page/index.js"
import {
  AUDIO_MAX_SECONDS,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
  ZERO,
} from "../../constants/index.js"
import { ITALY } from "../../data/regions/resolve.js"
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
                  label: "Title",
                  field: "title",
                  value: getFieldValue(entity, "title", ""),
                  placeholder: "E.g. Sundance Beats",
                  error: getFieldError(entity, "title"),
                  isRequired: true,
                  onField,
                })
          }
          ${this.renderTextField({
            label: "Location",
            field: "location",
            value: getFieldValue(entity, "location", ""),
            placeholder: "Venue Name",
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
                  label: "Region",
                  field: "region",
                  value: getFieldValue(entity, "region", ""),
                  placeholder: "E.g. Tuscany",
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
            label: "Event date",
            field: "event_date",
            value: getFieldValue(entity, "event_date", ""),
            type: "date",
            error: getFieldError(entity, "event_date"),
            isRequired: true,
            onField,
          })}
          ${this.renderTextField({
            label: "Application deadline",
            field: "application_deadline",
            value: getFieldValue(entity, "application_deadline", ""),
            type: "datetime-local",
            error: getFieldError(entity, "application_deadline"),
            isRequired: true,
            onField,
          })}
          ${this.renderTextField({
            label: "Max shortlist",
            field: "max_applicants",
            value: getFieldValue(entity, "max_applicants", ""),
            type: "number",
            error: getFieldError(entity, "max_applicants"),
            isRequired: true,
            onField,
          })}
          ${ErrorAlert.render({ error: entity.error, className: styles.error })}
          <div class=${styles.bottomBar}>
            ${Button.render({
              children: busy
                ? "Saving…"
                : entity.editing_event_id
                  ? "Save changes"
                  : "Save event",
              color: "primary",
              shape: "pill",
              size: "md",
              isFullWidth: true,
              isDisabled: busy,
              onClick: onSave,
            })}
          </div>
        `,
      ],
    })
  },

  renderHeaderActions({ entity, onRecordStop, onOpenAudio }) {
    return IconButton.render({
      icon: MaterialIcon.render({ name: "mic", size: "lg" }),
      ariaLabel: "Describe by voice",
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
        <span class=${styles.audioLabel}>Describe by voice</span>
        ${
          entity.is_recording
            ? html`
                ${Flex.render({
                  element: "p",
                  align: "center",
                  gap: "sm",
                  className: styles.recording,
                  children: html`<span class=${styles.recDot}></span> Listening…
                    tell us about your event`,
                })}
                <p class=${styles.timer}>
                  ${formatElapsed(entity.audio_elapsed ?? ZERO)} /
                  ${formatElapsed(AUDIO_MAX_SECONDS)}
                </p>
                ${Button.render({
                  children: "Stop",
                  variant: "outline",
                  shape: "pill",
                  size: "md",
                  isFullWidth: true,
                  onClick: onRecordStop,
                })}
                ${Button.render({
                  children: "Cancel",
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
                          <p class=${styles.transcribing}>Transcribing…</p>
                        `
                      : entity.is_parsing
                        ? html`
                            <p class=${styles.transcribing}>Filling fields…</p>
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
                        children: "Record again",
                        variant: "outline",
                        shape: "pill",
                        size: "md",
                        isFullWidth: true,
                        onClick: onRecordStart,
                      }),
                      Button.render({
                        children: "Remove",
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
                    children: "Start",
                    color: "primary",
                    shape: "pill",
                    size: "md",
                    isFullWidth: true,
                    onClick: onRecordStart,
                  })}
                  ${Button.render({
                    children: "Cancel",
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
        <p class=${styles.hint}>
          Talk through your event instead of typing — it will be transcribed
          into the fields below.
        </p>
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
