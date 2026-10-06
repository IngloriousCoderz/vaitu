import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { IconButton } from "@inglorious/ui/icon-button"
import { Select } from "@inglorious/ui/select"
import { html } from "@inglorious/web"

import {
  AUDIO_MAX_SECONDS,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
  ZERO,
} from "../../constants.js"
import { categories, categoryById } from "../events-page/categories.js"
import { renderIcon } from "../icon/index.js"
import styles from "./style.module.css"

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = String(totalSeconds % SECONDS_PER_MINUTE).padStart(
    PAD_LENGTH,
    "0",
  )
  return `${minutes}:${seconds}`
}

function renderTextField({ label, field, value, placeholder, type, onField }) {
  return html`
    <label class=${styles.field}>
      <span>${label}</span>
      <input
        type=${type ?? "text"}
        placeholder=${placeholder ?? ""}
        .value=${value ?? ""}
        @input=${(e) => onField({ field, value: e.target.value })}
      />
    </label>
  `
}

function renderDetailField({ spec, details, onDetailField }) {
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
      </label>
    `
  }
  return renderTextField({
    label: spec.label,
    field: spec.field,
    value: details[spec.field],
    onField: ({ field, value }) => onDetailField({ field, value }),
  })
}

function renderAudio({
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
                    ? html` <p class=${styles.transcribing}>Transcribing…</p> `
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
          ? html`<p class=${styles.error}>${entity.audio_error}</p>`
          : ""
      }
      <p class=${styles.hint}>
        Talk through your event instead of typing — it will be transcribed into
        the fields below.
      </p>
    </div>
  `
}

export function renderCreateEvent({
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
  renderCountry,
}) {
  const busy = entity.status === "saving"
  const category = categoryById(entity.category)
  const identityFields = category.createFields.filter(
    (spec) => spec.section === "identity",
  )
  const styleFields = category.createFields.filter(
    (spec) => spec.section === "style",
  )
  const title_is_derived = !category.title_from.input

  return html`
    <div class=${styles.page} data-category=${entity.category}>
      <button class=${styles.back} type="button" @click=${onBack}>
        ← Back
      </button>

      <header class=${styles.header}>
        <span class=${styles.title}>
          ${entity.editing_event_id ? "Edit event" : "New event"}
        </span>
        ${IconButton.render({
          icon: renderIcon({ name: "mic", size: 22 }),
          ariaLabel: "Describe by voice",
          className: styles.micButton,
          onClick: entity.is_recording ? onRecordStop : onOpenAudio,
        })}
      </header>

      ${renderAudio({
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
                color: category.id === entity.category ? "primary" : "default",
              })}
            </button>
          `,
        )}
      </div>

      ${identityFields.map((spec) =>
        renderDetailField({ spec, details: entity.details, onDetailField }),
      )}
      ${
        title_is_derived
          ? ""
          : renderTextField({
              label: "Title",
              field: "title",
              value: entity.title,
              placeholder: "Sundance Beats",
              onField,
            })
      }
      ${renderTextField({
        label: "Location",
        field: "location",
        value: entity.location,
        placeholder: "Florence",
        onField,
      })}
      <label class=${styles.field}>
        <span>Country</span>
        ${renderCountry()}
      </label>
      ${renderTextField({
        label: "Region",
        field: "region",
        value: entity.region,
        placeholder: "Tuscany",
        onField,
      })}
      ${styleFields.map((spec) =>
        renderDetailField({ spec, details: entity.details, onDetailField }),
      )}
      ${renderTextField({
        label: "Event date",
        field: "event_date",
        value: entity.event_date,
        type: "date",
        onField,
      })}
      ${renderTextField({
        label: "Application deadline",
        field: "application_deadline",
        value: entity.application_deadline,
        type: "datetime-local",
        onField,
      })}
      ${renderTextField({
        label: "Max shortlist",
        field: "max_applicants",
        value: entity.max_applicants,
        type: "number",
        onField,
      })}
      ${entity.error ? html`<p class=${styles.error}>${entity.error}</p>` : ""}
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
    </div>
  `
}
