import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Select } from "@inglorious/ui/select"
import { html } from "@inglorious/web"

import { countries } from "../../data/countries.js"
import { categories, categoryById } from "../events-page/categories.js"
import styles from "./style.module.css"

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

export function renderCreateEvent({
  entity,
  onField,
  onDetailField,
  onCategory,
  onSave,
  onBack,
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
      </header>

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
        ${Select.render({
          value: entity.country ?? "",
          isFullWidth: true,
          options: [{ value: "", label: "Select…" }].concat(
            countries.map((country) => ({ value: country, label: country })),
          ),
          onChange: (value) => onField({ field: "country", value }),
        })}
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
            ? entity.editing_event_id
              ? "Saving…"
              : "Creating…"
            : entity.editing_event_id
              ? "Save changes"
              : "Create event",
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
