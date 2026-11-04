import flagOutline from "@iconify-icons/material-symbols/flag-outline"
import { handleAsync } from "@inglorious/store/async"
import { Button } from "@inglorious/ui/button"
import { Dialog } from "@inglorious/ui/dialog"
import { Icon } from "@inglorious/ui/icon"
import { RadioGroup } from "@inglorious/ui/radio-group"
import { Textarea } from "@inglorious/ui/textarea"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { blockUser, reportContent } from "../../api/safety.js"
import { readUserId } from "../../api/session.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { ErrorAlert } from "../error-alert/index.js"
import styles from "./style.module.css"

const REASONS = ["spam", "inappropriate", "fake", "harassment", "other"]
const [DEFAULT_REASON] = REASONS
const STATUS_TOO_MANY_REQUESTS = 429

const reportSend = handleAsync("reportSend", {
  start(entity) {
    entity.status = "sending"
    entity.error = null
  },
  run: reportContent,
  success(entity) {
    entity.status = "sent"
  },
  error(entity, err) {
    entity.status = "idle"
    entity.error =
      err?.context?.status === STATUS_TOO_MANY_REQUESTS
        ? "safety.reportLimit"
        : "safety.reportFailed"
  },
})

const blockSend = handleAsync("blockSend", {
  start(entity) {
    entity.status = "sending"
    entity.error = null
  },
  run: blockUser,
  success(entity, _, api) {
    entity.status = "idle"
    entity.isOpen = false
    api.notify("#jobList:load")
    const router = api.getEntity("router")
    if (router.route === "jobDetail") {
      api.notify("#router:navigate", paths.jobs)
    }
    if (router.route === "applicationsReceived") {
      const { job_id } = api.getEntity("applicationsReceived")
      api.notify("#applicationsReceived:load", job_id)
    }
  },
  error(entity) {
    entity.status = "idle"
    entity.error = "safety.blockFailed"
  },
})

export const Safety = {
  ...reportSend,
  ...blockSend,

  create(entity) {
    entity.isOpen = false
    entity.target = null
    entity.reason = DEFAULT_REASON
    entity.details = ""
    entity.isConfirmingBlock = false
    entity.status = "idle"
    entity.error = null
  },

  /**
   * @param {object} entity
   * @param {{ type: "job" | "user" | "review", id: string, block_user_id?: string }} target
   * @param {object} api
   */
  safetyOpen(entity, target, api) {
    if (!readUserId()) {
      api.notify("#router:navigate", paths.login)
      return
    }
    entity.isOpen = true
    entity.target = target
    entity.reason = DEFAULT_REASON
    entity.details = ""
    entity.isConfirmingBlock = false
    entity.status = "idle"
    entity.error = null
  },

  safetyClose(entity) {
    entity.isOpen = false
  },

  safetyFieldSet(entity, { field, value }) {
    entity[field] = value
    entity.error = null
  },

  blockAsk(entity) {
    entity.isConfirmingBlock = true
  },

  blockCancel(entity) {
    entity.isConfirmingBlock = false
  },

  sessionEnd(entity) {
    entity.isOpen = false
  },

  render(entity, api) {
    if (!entity.isOpen) return ""
    const { target, status } = entity
    const isBusy = status === "sending"
    const close = () => api.notify("#safety:safetyClose")
    return Dialog.render({
      id: "safety",
      isOpen: true,
      size: "sm",
      title: t("safety.title"),
      closeLabel: t("common.close"),
      onClose: close,
      children: when(
        status === "sent",
        () => html`<p role="status">${t("safety.thanks")}</p>`,
        () =>
          when(
            entity.isConfirmingBlock,
            () =>
              html`<p>${t("safety.blockConfirm")}</p>
                ${ErrorAlert.render({ error: entity.error })}`,
            () => html`
              <div class=${styles.form}>
                ${RadioGroup.render({
                  id: "safety-reason",
                  label: t("safety.reasonLabel"),
                  value: entity.reason,
                  options: REASONS.map((value) => ({
                    value,
                    label: t(`safety.reasons.${value}`),
                  })),
                  onChange: (value) =>
                    api.notify("#safety:safetyFieldSet", {
                      field: "reason",
                      value,
                    }),
                })}
                ${Textarea.render({
                  id: "safety-details",
                  label: t("safety.detailsLabel"),
                  value: entity.details,
                  rows: 3,
                  isFullWidth: true,
                  onChange: (value) =>
                    api.notify("#safety:safetyFieldSet", {
                      field: "details",
                      value,
                    }),
                })}
                ${ErrorAlert.render({ error: entity.error })}
              </div>
            `,
          ),
      ),
      actions: when(
        status === "sent",
        () =>
          Button.render({
            children: t("common.close"),
            variant: "outline",
            shape: "pill",
            size: "md",
            isFullWidth: true,
            onClick: close,
          }),
        () =>
          when(
            entity.isConfirmingBlock,
            () =>
              html`<div class=${styles.actions}>
                ${Button.render({
                  children: t("safety.yesBlock"),
                  color: "error",
                  variant: "outline",
                  shape: "pill",
                  size: "md",
                  isDisabled: isBusy,
                  onClick: () =>
                    api.notify("#safety:blockSend", target.block_user_id),
                })}
                ${Button.render({
                  children: t("common.cancel"),
                  variant: "outline",
                  shape: "pill",
                  size: "md",
                  onClick: () => api.notify("#safety:blockCancel"),
                })}
              </div>`,
            () =>
              html`<div class=${styles.actions}>
                ${Button.render({
                  children: isBusy ? t("common.saving") : t("safety.send"),
                  color: "primary",
                  shape: "pill",
                  size: "md",
                  isDisabled: isBusy,
                  onClick: () =>
                    api.notify("#safety:reportSend", {
                      target_type: target.type,
                      target_id: target.id,
                      reason: entity.reason,
                      details: entity.details,
                    }),
                })}
                ${when(target.block_user_id, () =>
                  Button.render({
                    children: t("safety.block"),
                    color: "error",
                    variant: "ghost",
                    shape: "pill",
                    size: "md",
                    onClick: () => api.notify("#safety:blockAsk"),
                  }),
                )}
              </div>`,
          ),
      ),
    })
  },
}

export const SafetyButton = {
  /** @param {{ onClick: () => void, label?: string }} props */
  render({ onClick, label = t("safety.open") }) {
    return Button.render({
      children: html`<span class=${styles.trigger}
        >${Icon.render({ icon: flagOutline, size: "sm" })} ${label}</span
      >`,
      variant: "ghost",
      color: "default",
      size: "sm",
      onClick,
    })
  },
}
