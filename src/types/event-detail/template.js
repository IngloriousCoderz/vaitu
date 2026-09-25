import { html } from "@inglorious/web"

import { countdownLabel } from "../../api/events.js"
import {
  deadlineBadge,
  monogram,
  thumbGradient,
} from "../event-card/index.js"
import styles from "./style.module.css"

function renderFacts(event) {
  return html`
    <dl class=${styles.facts}>
      ${event.facts.map(
        (fact) => html`
          <div class=${styles.fact}>
            <dt>${fact.label}</dt>
            <dd>${fact.value}</dd>
          </div>
        `,
      )}
    </dl>
  `
}

function renderForm({ entity, onField, onSubmit }) {
  const canSubmit = entity.motivation.trim().length > 0
  return html`
    <form
      class=${styles.form}
      @submit=${(e) => {
        e.preventDefault()
        if (canSubmit) onSubmit()
      }}
    >
      <h3 class=${styles.sectionTitle}>Apply for this event</h3>
      <label class=${styles.field}>
        <span>Full name</span>
        <input
          type="text"
          placeholder="Your name"
          .value=${entity.fullName}
          @input=${(e) =>
            onField({ field: "fullName", value: e.target.value })}
        />
      </label>
      <label class=${styles.field}>
        <span>Website</span>
        <input
          type="url"
          placeholder="https://…"
          .value=${entity.website}
          @input=${(e) => onField({ field: "website", value: e.target.value })}
        />
      </label>
      <label class=${styles.field}>
        <span>Instagram</span>
        <input
          type="text"
          placeholder="@handle"
          .value=${entity.instagram}
          @input=${(e) =>
            onField({ field: "instagram", value: e.target.value })}
        />
      </label>
      <p class=${styles.disclaimer}>
        Only ${entity.event.maxApplicants} names will be forwarded to the
        organizer.
      </p>
      <label class=${styles.field}>
        <span>Why are you the ideal candidate for this event?</span>
        <textarea
          rows="4"
          placeholder="Tell your story…"
          .value=${entity.motivation}
          @input=${(e) =>
            onField({ field: "motivation", value: e.target.value })}
        ></textarea>
      </label>
      <button
        class=${styles.submit}
        type="submit"
        ?disabled=${!canSubmit}
      >
        Apply
      </button>
    </form>
  `
}

function renderSubmitted({ onBack }) {
  return html`
    <div class=${styles.submitted}>
      <div class=${styles.check}>✓</div>
      <h3 class=${styles.sectionTitle}>Application sent!</h3>
      <p class=${styles.feedback}>
        You will receive feedback within a few days.
      </p>
      <button class=${styles.submit} type="button" @click=${onBack}>
        Back to events
      </button>
    </div>
  `
}

export function renderDetail({
  entity,
  onBack,
  onField,
  onSubmit,
}) {
  const { event, status, error } = entity

  return html`
    <div class=${styles.page} data-category=${event?.category ?? "wedding"}>
      <button class=${styles.back} type="button" @click=${onBack}>
        ← Back
      </button>

      ${status === "loading"
        ? html`<p class=${styles.empty}>Loading event…</p>`
        : status === "error"
          ? html`<p class=${styles.empty}>${error}</p>`
          : entity.submitted
            ? renderSubmitted({ onBack })
            : html`
                <div
                  class=${styles.banner}
                  style="background:${thumbGradient(event.hue)}"
                >
                  <span class=${styles.bannerMonogram}>
                    ${monogram(event.title)}
                  </span>
                </div>
                <div class=${styles.topRow}>
                  <h2 class=${styles.title}>${event.title}</h2>
                  <span class=${styles.badge}>
                    ${deadlineBadge(event)}
                  </span>
                </div>
                <p class=${styles.meta}>${event.subtitle}</p>
                <span class=${styles.tag}>${event.tag}</span>
                ${renderFacts(event)}
                <p class=${styles.sender}>
                  Organized by ${entity.senderName}
                </p>
                <p class=${styles.countdown}>
                  ${countdownLabel(event)}
                </p>
                ${renderForm({ entity, onField, onSubmit })}
              `}
    </div>
  `
}
