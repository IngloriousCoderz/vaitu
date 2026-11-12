import { Badge } from "@inglorious/ui/badge"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"
import { Input } from "@inglorious/ui/input"
import { Lightbox } from "@inglorious/ui/lightbox"
import { Textarea } from "@inglorious/ui/textarea"
import { html, nothing } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError, getFieldValue } from "@inglorious/web/form"

import { countdownLabel, isApplicationClosed } from "../../api/jobs.js"
import { readUserId } from "../../api/session.js"
import { Badges } from "../../common/badges/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import {
  deadlineBadge,
  deadlineTone,
  jobMonogram,
  jobSubtitle,
  jobTag,
  jobTypeTags,
  thumbGradient,
} from "../../common/job-card/index.js"
import { LoadStatus } from "../../common/load-status/index.js"
import { Page } from "../../common/page/index.js"
import { formatPay } from "../../common/pay.js"
import { SafetyButton } from "../../common/safety/index.js"
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
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const toneClass = {
  closing: styles.badgeClosing,
  closed: styles.badgeClosed,
}

export const template = {
  render(props, api) {
    return this.renderJobDetail(props, api)
  },

  renderJobDetail({
    entity,
    profileComplete,
    onOpenJobs,
    onField,
    onSubmit,
    onCompleteProfile,
    onOpenApplications,
    onReport,
    onPhotoOpen,
    onPhotoClose,
    onPhotoStep,
  }) {
    const { job, status, error } = entity
    const msLeft = job?.application_deadline
      ? new Date(job.application_deadline).getTime() -
        (entity.nowTs ?? Date.now())
      : null
    const liveClosed = msLeft == null ? null : msLeft <= NO_TIME_LEFT
    const showClock = msLeft != null && msLeft > NO_TIME_LEFT && msLeft < DAY_MS
    const photos = job?.imageUrls ?? []

    return Page.render({
      variant: "document",
      wide: true,
      setting: job?.setting ?? "wedding",
      children: [
        Lightbox.render({
          images: photos,
          index: entity.photoIndex,
          isOpen: entity.isPhotoPreviewOpen,
          label: t("common.photoPreview"),
          closeLabel: t("common.photoClose"),
          previousLabel: t("common.photoPrevious"),
          nextLabel: t("common.photoNext"),
          onStep: onPhotoStep,
          onClose: onPhotoClose,
        }),
        html`
          ${
            /* Keyed on the data, not the status: `open` sets status to idle
               with a null job before the load starts. */
            LoadStatus.render({
              isError: status === "error",
              error,
              isLoading: !job,
              content: () =>
                when(
                  entity.isSubmitted,
                  () => this.renderSubmitted({ onOpenJobs }),
                  () => html`
                    <div class=${styles.stage}>
                      ${this.renderBanner(job, onPhotoOpen)}
                      <div class=${styles.story}>
                        ${Flex.render({
                          align: "center",
                          justify: "between",
                          gap: "sm",
                          className: styles.topRow,
                          children: [
                            html`<h2 class=${styles.title}>${job.title}</h2>`,
                            Badge.render({
                              children: deadlineBadge(job),
                              color:
                                deadlineTone(job) === "assigned"
                                  ? "success"
                                  : undefined,
                              shape: "pill",
                              className: detailToneClass(job),
                            }),
                          ],
                        })}
                        <p class=${styles.meta}>${jobSubtitle(job)}</p>
                        ${Flex.render({
                          gap: "sm",
                          wrap: "wrap",
                          children: [
                            ...jobTypeTags(job).map((tag) =>
                              Chip.render({ children: tag }),
                            ),
                            when(job.filterValues.length, () =>
                              Chip.render({ children: jobTag(job) }),
                            ),
                          ],
                        })}
                        ${when(
                          job.description,
                          () => html`
                            <section class=${styles.description}>
                              <h3 class=${styles.descriptionTitle}>
                                ${t("detail.description")}
                              </h3>
                              <p class=${styles.descriptionText}>
                                ${job.description
                                  .split("\n")
                                  .map(
                                    (line) =>
                                      html`<span class=${styles.descriptionLine}
                                        >${line}</span
                                      >`,
                                  )}
                              </p>
                            </section>
                          `,
                        )}
                        ${this.renderGallery(job, onPhotoOpen)}
                        ${this.renderFacts(job)}
                        <p class=${styles.poster}>
                          ${
                            readUserId()
                              ? t("pay.youEarn", { pay: formatPay(job.pay) })
                              : t("pay.signInToSee")
                          }
                        </p>
                        <p class=${styles.poster}>
                          ${t("detail.postedBy", { name: entity.posterName })}
                        </p>
                        ${when(entity.posterStats?.badges?.length, () =>
                          Badges.render({
                            badges: entity.posterStats.badges,
                          }),
                        )}
                        ${when(onReport, () => SafetyButton.render({ onClick: onReport }))}
                        <p class=${styles.countdown}>
                          ${
                            showClock
                              ? t("countdown.clock", {
                                  time: formatClock(
                                    Math.floor(msLeft / MS_PER_SECOND),
                                  ),
                                })
                              : countdownLabel(job)
                          }
                        </p>
                      </div>
                      <div class=${styles.panel}>
                        ${when(
                          onOpenApplications,
                          () => html`
                            <div class=${styles.actions}>
                              ${Button.render({
                                variant: "outline",
                                shape: "pill",
                                isFullWidth: true,
                                children: t("detail.reviewApplications"),
                                onClick: onOpenApplications,
                              })}
                            </div>
                          `,
                          () =>
                            when(
                              liveClosed || isApplicationClosed(job),
                              () => html`
                                <div class=${styles.closedBox}>
                                  ${t("detail.closed")}
                                </div>
                              `,
                              () =>
                                this.renderForm({
                                  entity,
                                  profileComplete,
                                  onField,
                                  onSubmit,
                                  onCompleteProfile,
                                }),
                            ),
                        )}
                      </div>
                    </div>
                  `,
                ),
            })
          }
        `,
      ],
    })
  },

  renderBanner(job, onPhotoOpen) {
    const photo = job.imageUrls?.[COVER_INDEX]
    return Flex.render({
      align: "center",
      justify: "center",
      className: styles.banner,
      style: `background:${thumbGradient(job.hue)}`,
      children: when(
        photo,
        () =>
          html`<button
            type="button"
            class=${styles.bannerPhoto}
            @click=${() => onPhotoOpen(COVER_INDEX)}
          >
            <img class=${styles.bannerImage} src=${photo} alt="" />
          </button>`,
        () =>
          html`<span class=${styles.bannerMonogram}>${jobMonogram(job)}</span>`,
      ),
    })
  },

  renderGallery(job, onPhotoOpen) {
    const photos = (job.imageUrls ?? []).slice(COVER_IMAGES)
    if (!photos.length) return nothing
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

  renderFacts(job) {
    return html`
      <dl class=${styles.facts}>
        ${job.facts.map((fact) =>
          Flex.render({
            justify: "between",
            className: styles.fact,
            children: html`
              <dt>${t(fact.label)}</dt>
              <dd>${fact.value}</dd>
            `,
          }),
        )}
      </dl>
    `
  },

  renderSubmitted({ onOpenJobs }) {
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
          children: t("detail.backToJobs"),
          color: "primary",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onOpenJobs,
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
    const sending = entity.applyStatus === "loading"
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
        ${when(
          getFieldValue(entity, "website", ""),
          () => html`
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
          `,
        )}
        ${when(
          getFieldValue(entity, "phone", ""),
          () => html`
            <div class=${styles.field}>
              ${Input.render({
                id: "apply-phone",
                label: t("fields.phone"),
                inputType: "tel",
                value: getFieldValue(entity, "phone", ""),
                isFullWidth: true,
                isReadOnly: true,
              })}
            </div>
          `,
        )}
        <p class=${styles.disclaimer}>
          ${t("detail.forwarded", { count: entity.job.max_applicants })}
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
            error: t(getFieldError(entity, "motivation")),
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

function detailToneClass(job) {
  const tone = deadlineTone(job)
  return toneClass[tone] ?? ""
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
