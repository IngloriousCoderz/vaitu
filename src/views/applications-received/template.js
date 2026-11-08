import callOutline from "@iconify-icons/material-symbols/call-outline"
import globeOutline from "@iconify-icons/material-symbols/globe-outline"
import keyboardArrowDownOutline from "@iconify-icons/material-symbols/keyboard-arrow-down-outline"
import locationOnOutline from "@iconify-icons/material-symbols/location-on-outline"
import { Button } from "@inglorious/ui/button"
import { Card } from "@inglorious/ui/card"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { Input } from "@inglorious/ui/input"
import { Lightbox } from "@inglorious/ui/lightbox"
import { RadioGroup } from "@inglorious/ui/radio-group"
import { Rating } from "@inglorious/ui/rating"
import { Textarea } from "@inglorious/ui/textarea"
import { html, nothing } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"
import { getFieldError } from "@inglorious/web/form"

import { Badges } from "../../common/badges/index.js"
import { ConfirmDialog } from "../../common/confirm-dialog/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { isSettlementOpen, JobDeal } from "../../common/job-deal/index.js"
import { LoadStatus } from "../../common/load-status/index.js"
import { Page } from "../../common/page/index.js"
import { formatPay } from "../../common/pay.js"
import { telUrl } from "../../common/profile.js"
import { ProfileAvatar } from "../../common/profile-avatar/index.js"
import { SafetyButton } from "../../common/safety/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import {
  COVER_IMAGES,
  COVER_INDEX,
  DATE_ISO_LENGTH,
  DATETIME_LOCAL_LENGTH,
  FIRST_INDEX,
} from "../../constants/index.js"
import { currentLocale, t } from "../../i18n/index.js"
import { isReviewDue } from "./helpers.js"
import styles from "./style.module.css"

const OUTCOMES = ["completed", "no_show", "cancelled"]

export const template = {
  render(props, api) {
    return this.renderApplicationsReceived(props, api)
  },

  renderApplicationsReceived({
    entity,
    onToggle,
    onSelect,
    onReject,
    onUnshortlist,
    onUnreject,
    onAskAssign,
    onAssign,
    onCancelAssign,
    onAssignAmount,
    onDealDraft,
    onDealPropose,
    onDealSettle,
    onAskReopen,
    onReopenDeadline,
    onReopen,
    onCancelReopen,
    onReviewField,
    onReviewSubmit,
    onReport,
    onPhotoOpen,
    onPhotoClose,
    onPhotoStep,
  }) {
    const { items, status, error } = entity
    const selected_count = items.filter(
      (i) => i.status === "shortlisted",
    ).length
    const max_reached =
      entity.max_applicants != null && selected_count >= entity.max_applicants
    const photos = entity.job_recap?.image_urls ?? []

    return Page.render({
      variant: "stickyFlat",
      wide: true,
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
          <header class=${styles.header}>
            ${when(
              entity.job_status === "assigned" ||
                entity.job_status === "closed",
              () => html`
                ${Button.render({
                  children: t("received.reopen"),
                  color: "primary",
                  shape: "pill",
                  size: "md",
                  isFullWidth: true,
                  onClick: onAskReopen,
                })}
                ${ConfirmDialog.render({
                  id: "reopen-confirm",
                  isOpen: entity.confirming_reopen,
                  message:
                    entity.job_status === "assigned"
                      ? t("received.reopenAssigned")
                      : t("received.reopenClosed"),
                  children: when(
                    deadlinePast(entity.job_deadline),
                    () => html`
                      <div class=${styles.field}>
                        <span>${t("received.newDeadline")}</span>
                        ${Input.render({
                          id: "received-reopen-deadline",
                          inputType: "datetime-local",
                          value: entity.reopen_deadline ?? "",
                          isFullWidth: true,
                          error: t(getFieldError(entity, "reopen_deadline")),
                          onChange: onReopenDeadline,
                        })}
                      </div>
                    `,
                  ),
                  error: status === "error" ? error : null,
                  confirmLabel: t("received.yesReopen"),
                  busyLabel: t("received.reopening"),
                  cancelLabel:
                    entity.job_status === "assigned"
                      ? t("received.keepAssigned")
                      : t("received.keepClosed"),
                  tone: "primary",
                  isBusy: status === "saving",
                  isDisabled:
                    deadlinePast(entity.job_deadline) &&
                    (entity.reopen_deadline ?? "").length !==
                      DATETIME_LOCAL_LENGTH,
                  onConfirm: onReopen,
                  onCancel: onCancelReopen,
                })}
              `,
            )}
          </header>

          ${when(entity.job_recap, () =>
            this.renderRecap(
              entity.job_recap,
              selected_count,
              entity.max_applicants,
              entity.pay,
              onPhotoOpen,
            ),
          )}

          <main class=${styles.list}>
            ${LoadStatus.render({
              isError: status === "error" && !items.length,
              error,
              isLoading: status === "loading" && !items.length,
              isEmpty: !items.length,
              emptyText:
                entity.job_status === "open"
                  ? t("received.none")
                  : t("received.noneReceived"),
              content: () =>
                items.map((item) =>
                  this.renderApplicant({
                    item,
                    expanded: entity.expanded_application_id === item.id,
                    max_reached,
                    confirming_assign: entity.confirming_assign === item.id,
                    assign_amount: entity.assign_amount,
                    deal_draft: entity.deal_draft,
                    is_deal_busy: entity.isDealBusy,
                    deal_error: entity.dealError,
                    onAssignAmount,
                    onDealDraft,
                    onDealPropose,
                    onDealSettle,
                    status,
                    error,
                    job_assigned: entity.job_status === "assigned",
                    job_date: entity.job_recap?.job_date,
                    review: entity.review,
                    onReviewField,
                    onReviewSubmit,
                    onReport,
                    onToggle,
                    onSelect,
                    onReject,
                    onUnshortlist,
                    onUnreject,
                    onAskAssign,
                    onAssign,
                    onCancelAssign,
                  }),
                ),
            })}
            ${ErrorAlert.render({
              error: status === "error" && items.length ? error : null,
              className: styles.error,
            })}
          </main>
        `,
      ],
    })
  },

  renderRecap(recap, shortlisted, maxApplicants, pay, onPhotoOpen) {
    const photos = recap.image_urls ?? []
    const rows = [
      [t("received.status"), translatedValue("status.", recap.status)],
      [t("fields.jobType"), recap.jobType],
      ...(recap.names ? [[t("received.names"), recap.names]] : []),
      ...(recap.style
        ? [
            [
              t("received.style"),
              translatedValue(
                ["taxonomy.style.", "taxonomy.genre."],
                recap.style,
              ),
            ],
          ]
        : []),
      [t("received.location"), recap.location || "—"],
      [t("received.jobDate"), formatDay(recap.job_date)],
      [t("received.deadline"), formatDeadline(recap.application_deadline)],
      [t("pay.title"), formatPay(pay)],
      [t("received.shortlist"), `${shortlisted}/${maxApplicants ?? "—"}`],
      [
        t("received.created"),
        formatDay((recap.created_at ?? "").slice(FIRST_INDEX, DATE_ISO_LENGTH)),
      ],
    ]
    return Card.render({
      element: "div",
      className: styles.recap,
      body: html`
        ${when(
          photos.length,
          () =>
            html`<div class=${styles.recapPhotos}>
              <button
                type="button"
                class=${styles.recapCover}
                @click=${() => onPhotoOpen(COVER_INDEX)}
              >
                <img src=${photos[COVER_INDEX]} alt="" />
              </button>
              ${when(photos.length > COVER_IMAGES, () =>
                Flex.render({
                  gap: "sm",
                  wrap: "wrap",
                  className: styles.recapGallery,
                  children: photos.slice(COVER_IMAGES).map(
                    (url, i) =>
                      html`<button
                        type="button"
                        class=${styles.recapThumb}
                        @click=${() => onPhotoOpen(i + COVER_IMAGES)}
                      >
                        <img src=${url} alt="" />
                      </button>`,
                  ),
                }),
              )}
            </div>`,
        )}
        <dl class=${styles.recapList}>
          ${rows.map(
            ([label, value]) => html`
              <div class=${styles.recapRow}>
                <dt>${label}</dt>
                <dd>${value}</dd>
              </div>
            `,
          )}
        </dl>
      `,
    })
  },

  renderApplicant({
    item,
    expanded,
    max_reached,
    confirming_assign,
    assign_amount,
    deal_draft,
    is_deal_busy,
    deal_error,
    onAssignAmount,
    onDealDraft,
    onDealPropose,
    onDealSettle,
    status,
    error,
    job_assigned,
    job_date,
    review,
    onReviewField,
    onReviewSubmit,
    onReport,
    onToggle,
    onSelect,
    onReject,
    onUnshortlist,
    onUnreject,
    onAskAssign,
    onAssign,
    onCancelAssign,
  }) {
    const applicant = item.applicant ?? {}
    return html`
      <article class=${styles.card}>
        <button
          class=${styles.rowButton}
          type="button"
          @click=${() => onToggle(item.id)}
          aria-expanded=${expanded}
        >
          ${ProfileAvatar.render({
            name: applicant.full_name,
            src: applicant.avatar_url,
            size: "lg",
            alt: "",
          })}
          <span class=${styles.name}
            >${applicant.full_name ?? t("common.deletedUser")}</span
          >
          ${StatusChip.render({ status: item.status })}
          <span
            class=${expanded ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
          >
            ${Icon.render({ icon: keyboardArrowDownOutline, size: "lg" })}
          </span>
        </button>
        ${when(
          expanded,
          () => html`
            <div class=${styles.expanded}>
              <div class=${styles.links}>
                ${when(
                  applicant.website,
                  () => html`
                    <a
                      class=${styles.metaLink}
                      href=${applicant.website}
                      target="_blank"
                      rel="noopener"
                    >
                      ${Icon.render({ icon: globeOutline, size: "lg" })}
                      <span>${applicant.website}</span>
                    </a>
                  `,
                )}
                ${when(
                  applicant.phone,
                  () => html`
                    <a class=${styles.metaLink} href=${telUrl(applicant.phone)}>
                      ${Icon.render({ icon: callOutline, size: "lg" })}
                      <span>${applicant.phone}</span>
                    </a>
                  `,
                )}
                ${when(
                  applicant.country,
                  () => html`
                    <span class=${styles.metaRow}>
                      ${Icon.render({ icon: locationOnOutline, size: "lg" })}
                      <span>${applicant.country}</span>
                    </span>
                  `,
                )}
              </div>
              ${this.renderReputation(item, onReport)}
              ${when(item.applicant_id, () =>
                SafetyButton.render({
                  onClick: () =>
                    onReport({
                      type: "user",
                      id: item.applicant_id,
                      block_user_id: item.applicant_id,
                    }),
                }),
              )}
              <p class=${styles.motivation}>${item.motivation}</p>
              ${when(item.status === "selected", () =>
                JobDeal.render({
                  role: "poster",
                  agreement: item.job_agreements,
                  settlements: item.job_settlements,
                  isSettlementDue: isSettlementOpen({
                    agreement: item.job_agreements,
                    status: item.status,
                    job_date,
                    review: item.job_reviews,
                  }),
                  draft: deal_draft,
                  isBusy: is_deal_busy,
                  error: deal_error,
                  onDraft: onDealDraft,
                  onPropose: () => onDealPropose(item.id),
                  onSettle: (isSettled) => onDealSettle(item.id, isSettled),
                }),
              )}
              ${when(item.job_reviews, () =>
                this.renderGivenReview(item.job_reviews),
              )}
              ${when(isReviewDue(item, job_date), () =>
                this.renderReviewForm({
                  item,
                  review,
                  onReviewField,
                  onReviewSubmit,
                }),
              )}
              ${when(
                (item.status === "pending" || item.status === "rejected") &&
                  !job_assigned,
                () => html`
                  <div class=${styles.actions}>
                    ${Button.render({
                      children: t("received.shortlistAction"),
                      variant: "outline",
                      shape: "pill",
                      size: "md",
                      isDisabled: max_reached,
                      className: styles.softInfo,
                      onClick: () => onSelect(item.id),
                    })}
                    ${when(
                      item.status === "pending",
                      () => html`
                        ${Button.render({
                          children: t("received.reject"),
                          color: "error",
                          variant: "outline",
                          shape: "pill",
                          size: "md",
                          onClick: () => onReject(item.id),
                        })}
                      `,
                      () => html`
                        ${Button.render({
                          children: t("received.backToPending"),
                          variant: "outline",
                          shape: "pill",
                          size: "md",
                          onClick: () => onUnreject(item.id),
                        })}
                      `,
                    )}
                  </div>
                `,
              )}
              ${when(
                item.status === "shortlisted" && !job_assigned,
                () => html`
                  <div class=${styles.actions}>
                    ${Button.render({
                      children: t("received.assign"),
                      color: "primary",
                      shape: "pill",
                      size: "md",
                      onClick: () => onAskAssign(item.id),
                    })}
                    ${Button.render({
                      children: t("received.removeFromShortlist"),
                      variant: "outline",
                      shape: "pill",
                      size: "md",
                      onClick: () => onUnshortlist(item.id),
                    })}
                  </div>
                  ${ConfirmDialog.render({
                    id: `assign-confirm-${item.id}`,
                    isOpen: confirming_assign,
                    message: t("received.assignConfirm"),
                    children: Input.render({
                      id: `assign-amount-${item.id}`,
                      label: t("deal.amountLabel"),
                      hint: t("deal.amountHint"),
                      inputType: "number",
                      value: assign_amount,
                      isFullWidth: true,
                      onChange: onAssignAmount,
                    }),
                    error: status === "error" ? error : null,
                    confirmLabel: t("received.yesAssign"),
                    busyLabel: t("received.assigning"),
                    cancelLabel: t("received.keepShortlist"),
                    tone: "primary",
                    isBusy: status === "saving",
                    onConfirm: () => onAssign(item.id),
                    onCancel: onCancelAssign,
                  })}
                `,
              )}
            </div>
          `,
        )}
      </article>
    `
  },

  renderReputation({ stats, reviews }, onReport) {
    if (!stats) return nothing
    return html`
      <div class=${styles.reputation}>
        <span class=${styles.reputationSummary}>
          ${stats.tier ? t(`ranks.tier.${stats.tier}`) : t("ranks.noRank")} ·
          ${t("reputation.completedJobs", { count: stats.completed_count })}
          ${when(
            stats.review_count,
            () =>
              html`·
              ${t("reputation.rating", {
                rating: stats.average_rating,
                count: stats.review_count,
              })}`,
          )}
        </span>
        ${when(stats.badges.length, () =>
          Badges.render({ badges: stats.badges }),
        )}
        ${reviews.map(
          (written) => html`
            <blockquote class=${styles.quote}>
              ${Rating.render({
                value: written.rating,
                isReadOnly: true,
                size: "sm",
                ariaLabel: t("reputation.ratingLabel"),
              })}
              <p>${written.comment}</p>
              ${SafetyButton.render({
                label: t("safety.reportReview"),
                onClick: () =>
                  onReport({ type: "review", id: written.application_id }),
              })}
            </blockquote>
          `,
        )}
      </div>
    `
  },

  renderGivenReview(given) {
    return html`
      <div class=${styles.reviewForm}>
        <strong>${t(`reputation.outcome.${given.outcome}`)}</strong>
        ${when(given.rating, () =>
          Rating.render({
            value: given.rating,
            isReadOnly: true,
            ariaLabel: t("reputation.ratingLabel"),
          }),
        )}
        ${when(given.comment, () => html`<p>${given.comment}</p>`)}
      </div>
    `
  },

  renderReviewForm({ item, review, onReviewField, onReviewSubmit }) {
    const isCompleted = review.outcome === "completed"
    return html`
      <div class=${styles.reviewForm}>
        ${RadioGroup.render({
          id: `review-outcome-${item.id}`,
          label: t("reputation.howDidItGo"),
          value: review.outcome,
          options: OUTCOMES.map((value) => ({
            value,
            label: t(`reputation.outcome.${value}`),
          })),
          onChange: (value) => onReviewField("outcome", value),
        })}
        ${when(
          isCompleted,
          () => html`
            ${Rating.render({
              id: `review-rating-${item.id}`,
              value: review.rating,
              ariaLabel: t("reputation.ratingLabel"),
              onChange: (value) => onReviewField("rating", value),
            })}
            ${Textarea.render({
              id: `review-comment-${item.id}`,
              label: t("reputation.commentLabel"),
              value: review.comment,
              rows: 3,
              isFullWidth: true,
              onChange: (value) => onReviewField("comment", value),
            })}
          `,
        )}
        ${ErrorAlert.render({ error: review.error })}
        ${Button.render({
          children:
            review.status === "saving"
              ? t("common.saving")
              : t("reputation.submit"),
          color: "primary",
          shape: "pill",
          size: "md",
          isDisabled: review.status === "saving",
          onClick: () => onReviewSubmit(item.id),
        })}
      </div>
    `
  },
}

function deadlinePast(iso) {
  if (!iso) return false
  return new Date(iso).getTime() <= Date.now()
}

function formatDay(iso) {
  if (!iso) return "—"
  return new Date(`${iso}T00:00`).toLocaleDateString(currentLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDeadline(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(currentLocale(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function prettyValue(value) {
  if (!value) return "—"
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function translatedValue(prefixes, value) {
  if (!value) return "—"
  const keys = [prefixes].flat().map((prefix) => `${prefix}${value}`)
  return t(keys, { defaultValue: prettyValue(value) })
}
