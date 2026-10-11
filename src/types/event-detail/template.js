import { Alert } from "@inglorious/ui/alert"
import { Badge } from "@inglorious/ui/badge"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

import { countdownLabel, isApplicationClosed } from "../../api/events.js"
import {
  DAY_MS,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
} from "../../constants.js"
import {
  deadlineBadge,
  deadlineTone,
  monogram,
  thumbGradient,
} from "../event-card/index.js"
import { Icon } from "../icon/index.js"
import styles from "./style.module.css"

export const EventDetail = {
  render(props, api) {
    this.renderEventDetail(props, api)
  },

  renderEventDetail({
    entity,
    profileComplete,
    onBack,
    onField,
    onSubmit,
    onCompleteProfile,
  }) {
    const { event, status, error } = entity
    const msLeft = event?.application_deadline
      ? new Date(event.application_deadline).getTime() -
        (entity.nowTs ?? Date.now())
      : null
    const liveClosed = msLeft == null ? null : msLeft <= 0
    const showClock = msLeft != null && msLeft > 0 && msLeft < DAY_MS

    return html`
      <div class=${styles.page} data-category=${event?.category ?? "wedding"}>
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
        ${
          status === "loading"
            ? html`<p class=${styles.empty}>Loading event…</p>`
            : status === "error"
              ? html`<p class=${styles.empty}>${error}</p>`
              : entity.isSubmitted
                ? this.renderSubmitted({ onBack })
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
                        className: detailToneClass(event),
                      })}
                    </div>
                    <p class=${styles.meta}>${event.subtitle}</p>
                    ${Chip.render({ children: event.tag })}
                    ${this.renderFacts(event)}
                    <p class=${styles.sender}>
                      Organized by ${entity.senderName}
                    </p>
                    <p class=${styles.countdown}>
                      ${
                        showClock
                          ? `Applications close in ${formatClock(Math.floor(msLeft / MS_PER_SECOND))}`
                          : countdownLabel(event)
                      }
                    </p>
                    ${
                      liveClosed || isApplicationClosed(event)
                        ? html`
                            <div class=${styles.closedBox}>
                              Applications are closed for this event.
                            </div>
                          `
                        : this.renderForm({
                            entity,
                            profileComplete,
                            onField,
                            onSubmit,
                            onCompleteProfile,
                          })
                    }
                  `
        }
      </div>
    `
  },

  renderFacts(event) {
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
  },

  renderSubmitted({ onBack }) {
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
  },

  renderForm({
    entity,
    profileComplete,
    onField,
    onSubmit,
    onCompleteProfile,
  }) {
    const sending = entity.applyStatus === "sending"
    const canSubmit =
      profileComplete && entity.motivation.trim() !== "" && !sending

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
        ${
          entity.applyError
            ? Alert.render({
                severity: "error",
                className: `vaitu-alert ${styles.error}`,
                children: entity.applyError,
              })
            : ""
        }
      </form>
    `
  },
}

const toneClass = {
  closing: styles.badgeClosing,
  closed: styles.badgeClosed,
}

function detailToneClass(event) {
  const tone = deadlineTone(event)
  return tone ? toneClass[tone] : ""
}

function formatClock(totalSeconds) {
  const hours = String(
    Math.floor(totalSeconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)),
  ).padStart(PAD_LENGTH, "0")
  const minutes = String(
    Math.floor(
      (totalSeconds % (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) /
        SECONDS_PER_MINUTE,
    ),
  ).padStart(PAD_LENGTH, "0")
  const seconds = String(totalSeconds % SECONDS_PER_MINUTE).padStart(
    PAD_LENGTH,
    "0",
  )
  return `${hours}:${minutes}:${seconds}`
}
