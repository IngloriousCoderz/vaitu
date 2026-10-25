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
  eventSubtitle,
  eventTag,
  monogram,
  thumbGradient,
} from "../../common/event-card/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { PhotoCarousel } from "../../common/photo-carousel/index.js"
import {
  COVER_IMAGES,
  COVER_INDEX,
  DAY_MS,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  NO_TIME_LEFT,
  PAD_LENGTH,
  SECONDS_PER_MINUTE,
} from "../../constants/index.js"
import { t, translated, translatedLabel } from "../../i18n/index.js"
import styles from "./style.module.css"

const toneClass = {
  closing: styles.badgeClosing,
  closed: styles.badgeClosed,
}

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
    onPhotoOpen,
    onPhotoClose,
    onPhotoStep,
    onPhotoSwipeStart,
    dir,
  }) {
    const { event, status, error } = entity
    const msLeft = event?.application_deadline
      ? new Date(event.application_deadline).getTime() -
        (entity.nowTs ?? Date.now())
      : null
    const liveClosed = msLeft == null ? null : msLeft <= NO_TIME_LEFT
    const showClock = msLeft != null && msLeft > NO_TIME_LEFT && msLeft < DAY_MS
    const photos = event?.imageUrls ?? []

    return Page.render({
      variant: "document",
      wide: true,
      category: event?.category ?? "wedding",
      children: [
        PhotoCarousel.render({
          urls: photos,
          index: entity.photoIndex,
          isOpen: entity.isPhotoPreviewOpen,
          swipeStartX: entity.photoSwipeX,
          dir,
          onStep: onPhotoStep,
          onSwipeStart: onPhotoSwipeStart,
          onClose: onPhotoClose,
        }),
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
              loadingText: t("detail.loading"),
            }) ??
            (entity.isSubmitted
              ? this.renderSubmitted({ onOpenEvents })
              : html`
                  <div class=${styles.stage}>
                    ${this.renderBanner(event, onPhotoOpen)}
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
                      <p class=${styles.meta}>${eventSubtitle(event)}</p>
                      ${Chip.render({ children: eventTag(event) })}
                      ${this.renderGallery(event, onPhotoOpen)}
                      ${this.renderFacts(event)}
                      <p class=${styles.sender}>
                        ${t("detail.organizedBy", { name: entity.senderName })}
                      </p>
                      <p class=${styles.countdown}>
                        ${
                          showClock
                            ? t("countdown.clock", {
                                time: formatClock(
                                  Math.floor(msLeft / MS_PER_SECOND),
                                ),
                              })
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
                                  children: t("detail.reviewApplications"),
                                  onClick: onOpenApplications,
                                })}
                              </div>
                            `
                          : liveClosed || isApplicationClosed(event)
                            ? html`
                                <div class=${styles.closedBox}>
                                  ${t("detail.closed")}
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

  renderBanner(event, onPhotoOpen) {
    const photo = event.imageUrls?.[COVER_INDEX]
    return Flex.render({
      align: "center",
      justify: "center",
      className: styles.banner,
      style: `background:${thumbGradient(event.hue)}`,
      children: photo
        ? html`<button
            type="button"
            class=${styles.bannerPhoto}
            @click=${() => onPhotoOpen(COVER_INDEX)}
          >
            <img class=${styles.bannerImage} src=${photo} alt="" />
          </button>`
        : html`<span class=${styles.bannerMonogram}
            >${monogram(event.title)}</span
          >`,
    })
  },

  renderGallery(event, onPhotoOpen) {
    const photos = (event.imageUrls ?? []).slice(COVER_IMAGES)
    if (!photos.length) return ""
    return Flex.render({
      gap: "sm",
      wrap: "wrap",
      className: styles.gallery,
      children: photos.map(
        (url, i) =>
          html`<button
            type="button"
            class=${styles.galleryThumb}
            @click=${() => onPhotoOpen(i + COVER_IMAGES)}
          >
            <img class=${styles.galleryImage} src=${url} alt="" />
          </button>`,
      ),
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
              <dt>${translatedLabel(fact)}</dt>
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
        <h3 class=${styles.sectionTitle}>${t("detail.sent")}</h3>
        <p class=${styles.feedback}>${t("detail.feedback")}</p>
        ${Button.render({
          children: t("detail.backToEvents"),
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
        <h3 class=${styles.sectionTitle}>${t("detail.applyTitle")}</h3>
        <p class=${styles.warn}>${t("detail.completeFirst")}</p>
        <div class=${styles.completeProfile}>
          ${Button.render({
            children: t("detail.completeProfile"),
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
        <h3 class=${styles.sectionTitle}>${t("detail.applyTitle")}</h3>
        <div class=${styles.field}>
          ${Input.render({
            id: "apply-full-name",
            label: t("auth.fullName"),
            inputType: "text",
            value: getFieldValue(entity, "full_name", ""),
            isFullWidth: true,
            isReadOnly: true,
          })}
        </div>
        <div class=${styles.field}>
          ${Input.render({
            id: "apply-website",
            label: t("fields.website"),
            inputType: "url",
            value: getFieldValue(entity, "website", ""),
            isFullWidth: true,
            isReadOnly: true,
          })}
        </div>
        <div class=${styles.field}>
          ${Input.render({
            id: "apply-instagram",
            label: t("fields.instagram"),
            inputType: "text",
            value: getFieldValue(entity, "instagram", ""),
            isFullWidth: true,
            isReadOnly: true,
          })}
        </div>
        <p class=${styles.disclaimer}>
          ${t("detail.forwarded", { count: entity.event.max_applicants })}
        </p>
        <div class=${styles.field}>
          ${Textarea.render({
            id: "apply-motivation",
            label: t("detail.motivation"),
            value: motivation,
            rows: 4,
            placeholder: t("detail.motivationPlaceholder"),
            isFullWidth: true,
            isRequired: true,
            error: translated(getFieldError(entity, "motivation")),
            onChange: (value) => onField({ field: "motivation", value }),
          })}
        </div>
        ${Button.render({
          children: sending ? t("detail.sending") : t("detail.apply"),
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
