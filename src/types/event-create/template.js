import { Alert } from "@inglorious/ui/alert"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { IconButton } from "@inglorious/ui/icon-button"
import { Select } from "@inglorious/ui/select"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import {
  AUDIO_MAX_SECONDS,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
  ZERO,
} from "../../constants/index.js"
import { ITALY } from "../../data/regions/resolve.js"
import { ErrorLabel } from "../error-label/index.js"
import { categories, categoryById } from "../event-list/categories.js"
import { Icon } from "../icon/index.js"
import { Page } from "../page/index.js"
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
      onBack,
      onRecordStart,
      onRecordStop,
      onOpenAudio,
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
    const styleFields = category.createFields.filter(
      (spec) => spec.section === "style",
    )
    const title_is_derived = !category.title_from.input

    return Page.render({
      variant: "sticky",
      category: categoryId,
      children: [
        html`
          ${Button.render({
            children: html`
              ${Icon.render({ name: "arrow-left", size: 16 })}
              <span>Back</span>
            `,
            variant: "ghost",
            shape: "pill",
            className: "vaitu-back",
            ariaLabel: "Back",
            onClick: onBack,
          })}

          <header class=${styles.header}>
            <span class=${styles.title}>
              ${entity.editing_event_id ? "Edit event" : "New event"}
            </span>
            ${IconButton.render({
              icon: Icon.render({ name: "mic", size: 22 }),
              ariaLabel: "Describe by voice",
              className: styles.micButton,
              onClick: entity.is_recording ? onRecordStop : onOpenAudio,
            })}
          </header>

          ${this.renderAudio({
            entity,
            onRecordStart,
            onRecordStop,
            onCancelAudio,
            onRemoveAudio,
          })}

          <div class=${styles.chips}>
            ${categories.map(
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
            )}
          </div>

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
                  onField,
                })
          }
          ${this.renderTextField({
            label: "Location",
            field: "location",
            value: getFieldValue(entity, "location", ""),
            placeholder: "Venue Name",
            error: getFieldError(entity, "location"),
            onField,
          })}
          <div class=${styles.field}>
            <span>Country</span>
            ${api.render("country-create")}
            ${ErrorLabel.render({ error: getFieldError(entity, "country") })}
          </div>
          ${
            country === ITALY
              ? html`
                  <div class=${styles.field}>
                    <span>Region</span>
                    ${api.render("region-create")}
                    ${ErrorLabel.render({
                      error: getFieldError(entity, "region"),
                    })}
                  </div>
                `
              : this.renderTextField({
                  label: "Region",
                  field: "region",
                  value: getFieldValue(entity, "region", ""),
                  placeholder: "E.g. Tuscany",
                  error: getFieldError(entity, "region"),
                  onField,
                })
          }
          ${styleFields.map((spec) =>
            this.renderDetailField({
              spec,
              details,
              error: getFieldError(entity, `details.${spec.field}`),
              onDetailField,
            }),
          )}
          ${this.renderTextField({
            label: "Event date",
            field: "event_date",
            value: getFieldValue(entity, "event_date", ""),
            type: "date",
            error: getFieldError(entity, "event_date"),
            onField,
          })}
          ${this.renderTextField({
            label: "Application deadline",
            field: "application_deadline",
            value: getFieldValue(entity, "application_deadline", ""),
            type: "datetime-local",
            error: getFieldError(entity, "application_deadline"),
            onField,
          })}
          ${this.renderTextField({
            label: "Max shortlist",
            field: "max_applicants",
            value: getFieldValue(entity, "max_applicants", ""),
            type: "number",
            error: getFieldError(entity, "max_applicants"),
            onField,
          })}
          ${
            entity.error
              ? Alert.render({
                  severity: "error",
                  className: `vaitu-alert ${styles.error}`,
                  children: entity.error,
                })
              : ""
          }
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
    return html`
      <div class=${styles.audioBox}>
        <span class=${styles.audioLabel}>Describe by voice</span>
        ${
          entity.is_recording
            ? html`
                <p class=${styles.recording}>
                  <span class=${styles.recDot}></span> Listening… tell us about
                  your event
                </p>
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
                <button
                  class=${styles.cancelButton}
                  type="button"
                  @click=${onCancelAudio}
                >
                  Cancel
                </button>
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
                  <div class=${styles.audioActions}>
                    ${Button.render({
                      children: "Record again",
                      variant: "outline",
                      shape: "pill",
                      size: "md",
                      isFullWidth: true,
                      onClick: onRecordStart,
                    })}
                    ${Button.render({
                      children: "Remove",
                      variant: "outline",
                      shape: "pill",
                      size: "md",
                      isFullWidth: true,
                      onClick: onRemoveAudio,
                    })}
                  </div>
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
                  <button
                    class=${styles.cancelButton}
                    type="button"
                    @click=${onCancelAudio}
                  >
                    Cancel
                  </button>
                `
        }
        ${
          entity.audio_error
            ? Alert.render({
                severity: "error",
                className: `vaitu-alert ${styles.error}`,
                children: entity.audio_error,
              })
            : ""
        }
        <p class=${styles.hint}>
          Talk through your event instead of typing — it will be transcribed
          into the fields below.
        </p>
      </div>
    `
  },

  renderDetailField({ spec, details, error, onDetailField }) {
    if (spec.type === "select") {
      return html`
        <label class=${styles.field}>
          <span>${spec.label}</span>
          ${Select.render({
            value: details[spec.field] ?? "",
            isFullWidth: true,
            options: [{ value: "", label: "Select…" }].concat(
              spec.options.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ),
            onChange: (value) => onDetailField({ field: spec.field, value }),
          })}
          ${ErrorLabel.render({ error })}
        </label>
      `
    }

    return this.renderTextField({
      label: spec.label,
      field: spec.field,
      value: details[spec.field],
      error,
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
    onField,
  }) {
    return html`
      <label class=${styles.field}>
        <span>${label}</span>
        <input
          type=${type ?? "text"}
          placeholder=${placeholder}
          .value=${value}
          @input=${(e) => onField({ field, value: e.target.value })}
        />
        ${ErrorLabel.render({ error })}
      </label>
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
