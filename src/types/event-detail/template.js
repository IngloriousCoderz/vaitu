import { html } from "@inglorious/web"
import { Badge } from "@inglorious/ui/badge"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"

import { countdownLabel } from "../../api/events.js"
import { renderIcon } from "../icon/index.js"
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

function renderForm({
  entity,
  profileComplete,
  onField,
  onSubmit,
  onCompleteProfile,
}) {
  const sending = entity.applyStatus === "sending"
  const canSubmit =
    profileComplete && entity.motivation.trim().length > 0 && !sending

  if (!profileComplete) {
    return html`
      <h3 class=${styles.sectionTitle}>Apply for this event</h3>
      <p class=${styles.warn}>
        Complete your profile (name, website and Instagram) before applying.
      </p>
      <div class=${styles.bottomBar}>
        ${Button.render({
          children: "Complete profile",
          color: "primary",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onCompleteProfile,
        })}
      </div>
    `
  }

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
        <input type="text" .value=${entity.full_name} disabled />
      </label>
      <label class=${styles.field}>
        <span>Website</span>
        <input type="url" .value=${entity.website} disabled />
      </label>
      <label class=${styles.field}>
        <span>Instagram</span>
        <input type="text" .value=${entity.instagram} disabled />
      </label>
      <p class=${styles.disclaimer}>
        Only ${entity.event.max_applicants} names will be forwarded to the
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
      ${Button.render({
        children: sending ? "Sending…" : "Apply",
        color: "primary",
        shape: "pill",
        size: "md",
        isFullWidth: true,
        isDisabled: !canSubmit,
        onClick: () => {
          if (canSubmit) onSubmit()
        },
      })}
      ${entity.applyError
        ? html`<p class=${styles.error}>${entity.applyError}</p>`
        : ""}
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
      ${Button.render({
        children: "Back to events",
        color: "primary",
        shape: "pill",
        size: "md",
        isFullWidth: true,
        onClick: onBack,
      })}
    </div>
  `
}

export function renderDetail({
  entity,
  profileComplete,
  onBack,
  onField,
  onSubmit,
  onCompleteProfile,
}) {
  const { event, status, error } = entity

  return html`
    <div class=${styles.page} data-category=${event?.category ?? "wedding"}>
      <button class=${styles.back} type="button" @click=${onBack}>
        ${renderIcon({ name: "arrow-left", size: 16 })}
        <span>Back</span>
      </button>

      ${status === "loading"
        ? html`<p class=${styles.empty}>Loading event…</p>`
        : status === "error"
          ? html`<p class=${styles.empty}>${error}</p>`
          : entity.isSubmitted
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
                  ${Badge.render({
                    children: deadlineBadge(event),
                    shape: "pill",
                  })}
                </div>
                <p class=${styles.meta}>${event.subtitle}</p>
                ${Chip.render({ children: event.tag })}
                ${renderFacts(event)}
                <p class=${styles.sender}>
                  Organized by ${entity.senderName}
                </p>
                <p class=${styles.countdown}>
                  ${countdownLabel(event)}
                </p>
                ${renderForm({
                  entity,
                  profileComplete,
                  onField,
                  onSubmit,
                  onCompleteProfile,
                })}
              `}
    </div>
  `
}
