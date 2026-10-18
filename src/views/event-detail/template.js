import { Badge } from "@inglorious/ui/badge"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { Input } from "@inglorious/ui/input"
import { Textarea } from "@inglorious/ui/textarea"
import { html } from "@inglorious/web"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { countdownLabel, isApplicationClosed } from "../../api/events.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import {
  deadlineBadge,
  deadlineTone,
  monogram,
  thumbGradient,
} from "../../common/event-card/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import {
  DAY_MS,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
} from "../../constants/index.js"
import styles from "./style.module.css"

export const EventDetail = {
  render(props, api) {
    return this.renderEventDetail(props, api)
  },

  renderEventDetail({
    entity,
    profileComplete,
    onOpenEvents,
    onField,
    onSubmit,
    onCompleteProfile,
    onOpenApplications,
  }) {
    const { event, status, error } = entity
    const msLeft = event?.application_deadline
      ? new Date(event.application_deadline).getTime() -
        (entity.nowTs ?? Date.now())
      : null
    const liveClosed = msLeft == null ? null : msLeft <= 0
    const showClock = msLeft != null && msLeft > 0 && msLeft < DAY_MS

    return Page.render({
      variant: "document",
      wide: true,
      category: event?.category ?? "wedding",
      children: [
        html`
          ${
            /* Keyed on the data rather than on the status string. `open` sets
               status to "idle" with a null event before its load handler starts,
               and a render landing in that window used to fall through to the
               detail branch and read event.hue off null. Anything without an
               event yet is loading, whatever the status happens to say. */
            PageStatus.render({
              isError: status === "error",
              error,
              isLoading: !event,
              loadingText: "Loading event…",
            }) ??
            (entity.isSubmitted
              ? this.renderSubmitted({ onOpenEvents })
              : html`
                  <div class=${styles.stage}>
                    ${Flex.render({
                      align: "center",
                      justify: "center",
                      className: styles.banner,
                      style: `background:${thumbGradient(event.hue)}`,
                      children: html`<span class=${styles.bannerMonogram}>
                        ${monogram(event.title)}
                      </span>`,
                    })}
                    <div class=${styles.story}>
                      ${Flex.render({
                        align: "center",
                        justify: "between",
                        gap: "sm",
                        className: styles.topRow,
                        children: [
                          html`<h2 class=${styles.title}>${event.title}</h2>`,
                          Badge.render({
                            children: deadlineBadge(event),
                            shape: "pill",
                            className: detailToneClass(event),
                          }),
                        ],
                      })}
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
                    </div>
                    <div class=${styles.panel}>
                      ${
                        onOpenApplications
                          ? html`
                              <div class=${styles.actions}>
                                ${Button.render({
                                  variant: "outline",
                                  shape: "pill",
                                  isFullWidth: true,
                                  children:
                                    "Review the applications you received",
                                  onClick: onOpenApplications,
                                })}
                              </div>
                            `
                          : liveClosed || isApplicationClosed(event)
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
                    </div>
                  </div>
                `)
          }
        `,
      ],
    })
  },

  renderFacts(event) {
    return html`
      <dl class=${styles.facts}>
        ${event.facts.map((fact) =>
          Flex.render({
            justify: "between",
            className: styles.fact,
            children: html`
              <dt>${fact.label}</dt>
              <dd>${fact.value}</dd>
            `,
          }),
        )}
      </dl>
    `
  },

  renderSubmitted({ onOpenEvents }) {
    return html`
      <div class=${styles.submitted}>
        ${Flex.render({
          align: "center",
          justify: "center",
          className: styles.check,
          children: "✓",
        })}
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
          onClick: onOpenEvents,
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
    const motivation = getFieldValue(entity, "motivation", "")
    const canSubmit = profileComplete && !sending

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

    return Flex.render({
      element: "form",
      direction: "column",
      className: styles.form,
      novalidate: true,
      onSubmit: (e) => {
        e.preventDefault()
        if (canSubmit) onSubmit()
      },
      children: html`
        <h3 class=${styles.sectionTitle}>Apply for this event</h3>
        <div class=${styles.field}>
          ${Input.render({
            id: "apply-full-name",
            label: "Full name",
            inputType: "text",
            value: getFieldValue(entity, "full_name", ""),
            isFullWidth: true,
            isReadOnly: true,
          })}
        </div>
        <div class=${styles.field}>
          ${Input.render({
            id: "apply-website",
            label: "Website",
            inputType: "url",
            value: getFieldValue(entity, "website", ""),
            isFullWidth: true,
            isReadOnly: true,
          })}
        </div>
        <div class=${styles.field}>
          ${Input.render({
            id: "apply-instagram",
            label: "Instagram",
            inputType: "text",
            value: getFieldValue(entity, "instagram", ""),
            isFullWidth: true,
            isReadOnly: true,
          })}
        </div>
        <p class=${styles.disclaimer}>
          Only ${entity.event.max_applicants} names will be forwarded to the
          organizer.
        </p>
        <div class=${styles.field}>
          ${Textarea.render({
            id: "apply-motivation",
            label: "Why are you the ideal candidate for this event?",
            value: motivation,
            rows: 4,
            placeholder: "Tell your story…",
            isFullWidth: true,
            isRequired: true,
            error: getFieldError(entity, "motivation"),
            onChange: (value) => onField({ field: "motivation", value }),
          })}
        </div>
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
        ${ErrorAlert.render({
          error: entity.applyError,
          className: styles.error,
        })}
      `,
    })
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
