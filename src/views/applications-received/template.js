import globeOutline from "@iconify-icons/material-symbols/globe-outline"
import keyboardArrowDownOutline from "@iconify-icons/material-symbols/keyboard-arrow-down-outline"
import locationOnOutline from "@iconify-icons/material-symbols/location-on-outline"
import photoCameraOutline from "@iconify-icons/material-symbols/photo-camera-outline"
import { Button } from "@inglorious/ui/button"
import { Card } from "@inglorious/ui/card"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { getFieldError } from "@inglorious/web/form"

import { ConfirmPrompt } from "../../common/confirm-prompt/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { PhotoCarousel } from "../../common/photo-carousel/index.js"
import { StatusChip } from "../../common/status-chip/index.js"
import {
  DATE_ISO_LENGTH,
  DATETIME_LOCAL_LENGTH,
  SINGULAR,
} from "../../constants/index.js"
import { currentLocale, t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const ApplicationsReceived = {
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
    onAskReopen,
    onReopenDeadline,
    onReopen,
    onCancelReopen,
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
    const photos = entity.event_recap?.image_urls ?? []

    return Page.render({
      variant: "stickyFlat",
      wide: true,
      children: [
        PhotoCarousel.render({
          urls: photos,
          index: entity.photoIndex,
          open: entity.photoPreview,
          onStep: onPhotoStep,
          onClose: onPhotoClose,
        }),
        html`
          <header class=${styles.header}>
            ${
              entity.event_status === "assigned" ||
              entity.event_status === "closed"
                ? html`
                    ${
                      entity.confirming_reopen
                        ? ConfirmPrompt.render({
                            message:
                              entity.event_status === "assigned"
                                ? t("received.reopenAssigned")
                                : t("received.reopenClosed"),
                            children: deadlinePast(entity.event_deadline)
                              ? html`
                                  <div class=${styles.field}>
                                    <span>${t("received.newDeadline")}</span>
                                    ${Input.render({
                                      id: "received-reopen-deadline",
                                      inputType: "datetime-local",
                                      value: entity.reopen_deadline ?? "",
                                      isFullWidth: true,
                                      error: getFieldError(
                                        entity,
                                        "reopen_deadline",
                                      ),
                                      onChange: onReopenDeadline,
                                    })}
                                  </div>
                                `
                              : "",
                            confirmLabel: t("received.yesReopen"),
                            busyLabel: t("received.reopening"),
                            cancelLabel:
                              entity.event_status === "assigned"
                                ? t("received.keepAssigned")
                                : t("received.keepClosed"),
                            tone: "primary",
                            isBusy: status === "saving",
                            isDisabled:
                              deadlinePast(entity.event_deadline) &&
                              (entity.reopen_deadline ?? "").length !==
                                DATETIME_LOCAL_LENGTH,
                            onConfirm: onReopen,
                            onCancel: onCancelReopen,
                          })
                        : html`
                            ${Button.render({
                              children: t("received.reopen"),
                              color: "primary",
                              shape: "pill",
                              size: "md",
                              isFullWidth: true,
                              onClick: onAskReopen,
                            })}
                          `
                    }
                  `
                : ""
            }
          </header>

          ${
            entity.event_recap
              ? this.renderRecap(
                  entity.event_recap,
                  selected_count,
                  entity.max_applicants,
                  onPhotoOpen,
                )
              : ""
          }

          <main class=${styles.list}>
            ${
              PageStatus.render({
                isError: status === "error" && !items.length,
                error,
                isLoading: status === "loading",
                loadingText: t("applications.loading"),
                isEmpty: !items.length,
                emptyText:
                  entity.event_status === "open"
                    ? t("received.none")
                    : t("received.noneReceived"),
              }) ??
              items.map((item) =>
                this.renderApplicant({
                  item,
                  expanded: entity.expanded_application_id === item.id,
                  max_reached,
                  confirming_assign: entity.confirming_assign === item.id,
                  event_assigned: entity.event_status === "assigned",
                  onToggle,
                  onSelect,
                  onReject,
                  onUnshortlist,
                  onUnreject,
                  onAskAssign,
                  onAssign,
                  onCancelAssign,
                }),
              )
            }
            ${ErrorAlert.render({
              error:
                status === "error" && items.length >= SINGULAR ? error : null,
              className: styles.error,
            })}
          </main>
        `,
      ],
    })
  },

  renderRecap(recap, shortlisted, maxApplicants, onPhotoOpen) {
    const photos = recap.image_urls ?? []
    const rows = [
      [t("received.status"), translatedValue("status.", recap.status)],
      [t("received.names"), recap.names || "—"],
      [
        t("received.style"),
        translatedValue(["taxonomy.style.", "taxonomy.genre."], recap.style),
      ],
      [t("received.location"), recap.location || "—"],
      [t("received.eventDate"), formatDay(recap.event_date)],
      [t("received.deadline"), formatDeadline(recap.application_deadline)],
      [t("received.shortlist"), `${shortlisted}/${maxApplicants ?? "—"}`],
      [
        t("received.created"),
        formatDay((recap.created_at ?? "").slice(0, DATE_ISO_LENGTH)),
      ],
    ]
    return Card.render({
      element: "div",
      className: styles.recap,
      body: html`
        ${
          photos.length
            ? html`<div class=${styles.recapPhotos}>
                <button
                  type="button"
                  class=${styles.recapCover}
                  @click=${() => onPhotoOpen(0)}
                >
                  <img src=${photos[0]} alt="" />
                </button>
                ${
                  photos.length > SINGULAR
                    ? Flex.render({
                        gap: "sm",
                        wrap: "wrap",
                        className: styles.recapGallery,
                        children: photos.slice(SINGULAR).map(
                          (url, i) =>
                            html`<button
                              type="button"
                              class=${styles.recapThumb}
                              @click=${() => onPhotoOpen(i + SINGULAR)}
                            >
                              <img src=${url} alt="" />
                            </button>`,
                        ),
                      })
                    : ""
                }
              </div>`
            : ""
        }
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
    event_assigned,
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
    const instagram = (applicant.instagram_handle ?? "")
      .trim()
      .replace(/^@+/, "")
    return html`
      <article class=${styles.card}>
        <button
          class=${styles.rowButton}
          type="button"
          @click=${() => onToggle(item.id)}
          aria-expanded=${expanded}
        >
          <span class=${styles.name}>${applicant.full_name ?? "—"}</span>
          ${StatusChip.render({ status: item.status })}
          <span
            class=${expanded ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
          >
            ${Icon.render({ icon: keyboardArrowDownOutline, size: "lg" })}
          </span>
        </button>
        ${
          expanded
            ? html`
                <div class=${styles.expanded}>
                  <div class=${styles.links}>
                    ${
                      applicant.website
                        ? html`
                            <a
                              class=${styles.metaLink}
                              href=${applicant.website}
                              target="_blank"
                              rel="noopener"
                            >
                              ${Icon.render({ icon: globeOutline, size: "lg" })}
                              <span>${applicant.website}</span>
                            </a>
                          `
                        : ""
                    }
                    ${
                      instagram
                        ? html`
                            <a
                              class=${styles.metaLink}
                              href=${`https://instagram.com/${instagram}`}
                              target="_blank"
                              rel="noopener"
                            >
                              ${Icon.render({ icon: photoCameraOutline, size: "lg" })}
                              <span>@${instagram}</span>
                            </a>
                          `
                        : ""
                    }
                    ${
                      applicant.country
                        ? html`
                            <span class=${styles.metaRow}>
                              ${Icon.render({ icon: locationOnOutline, size: "lg" })}
                              <span>${applicant.country}</span>
                            </span>
                          `
                        : ""
                    }
                  </div>
                  <p class=${styles.motivation}>${item.motivation}</p>
                  ${
                    (item.status === "pending" || item.status === "rejected") &&
                    !event_assigned
                      ? html`
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
                            ${
                              item.status === "pending"
                                ? html`
                                    ${Button.render({
                                      children: t("received.reject"),
                                      color: "error",
                                      variant: "outline",
                                      shape: "pill",
                                      size: "md",
                                      onClick: () => onReject(item.id),
                                    })}
                                  `
                                : html`
                                    ${Button.render({
                                      children: t("received.backToPending"),
                                      variant: "outline",
                                      shape: "pill",
                                      size: "md",
                                      onClick: () => onUnreject(item.id),
                                    })}
                                  `
                            }
                          </div>
                        `
                      : ""
                  }
                  ${
                    item.status === "shortlisted" && !event_assigned
                      ? html`
                          ${
                            confirming_assign
                              ? ConfirmPrompt.render({
                                  id: "assign-confirm",
                                  message: t("received.assignConfirm"),
                                  confirmLabel: t("received.yesAssign"),
                                  busyLabel: t("received.assigning"),
                                  cancelLabel: t("received.keepShortlist"),
                                  tone: "primary",
                                  isBusy: status === "saving",
                                  onConfirm: () => onAssign(item.id),
                                  onCancel: onCancelAssign,
                                })
                              : html`
                                  <div class=${styles.actions}>
                                    ${Button.render({
                                      children: t("received.assign"),
                                      color: "primary",
                                      shape: "pill",
                                      size: "md",
                                      onClick: () => onAskAssign(item.id),
                                    })}
                                    ${Button.render({
                                      children: t(
                                        "received.removeFromShortlist",
                                      ),
                                      variant: "outline",
                                      shape: "pill",
                                      size: "md",
                                      onClick: () => onUnshortlist(item.id),
                                    })}
                                  </div>
                                `
                          }
                        `
                      : ""
                  }
                </div>
              `
            : ""
        }
      </article>
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

// A stored value (status, style, genre) by name in the active language,
// trying each key prefix in turn; the prettified value when none has it.
function translatedValue(prefixes, value) {
  if (!value) return "—"
  const keys = [prefixes].flat().map((prefix) => `${prefix}${value}`)
  return t(keys, { defaultValue: prettyValue(value) })
}
