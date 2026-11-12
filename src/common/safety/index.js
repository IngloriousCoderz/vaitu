import { handleRequest } from "@inglorious/store/async"

import { blockUser, reportContent } from "../../api/safety.js"
import { readUserId } from "../../api/session.js"
import { SAFETY_REASONS } from "../../constants/index.js"
import { paths } from "../../routes.js"
import { template } from "./template.js"

const [DEFAULT_REASON] = SAFETY_REASONS
const STATUS_TOO_MANY_REQUESTS = 429

const reportSend = handleRequest(
  "reportSend",
  { run: reportContent },
  {
    toError: (error) =>
      error?.context?.status === STATUS_TOO_MANY_REQUESTS
        ? "safety.reportLimit"
        : "safety.reportFailed",
  },
)

const blockSend = handleRequest(
  "blockSend",
  {
    run: blockUser,
    success(entity, _, api) {
      // The dialog closes: not the report's thanks on the way out.
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
  },
  { toError: () => "safety.blockFailed" },
)

export const Safety = {
  ...reportSend,
  ...blockSend,
  ...template,

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
    const { target } = entity
    return this.renderSafety({
      isOpen: entity.isOpen,
      status: entity.status,
      reason: entity.reason,
      details: entity.details,
      error: entity.error,
      isConfirmingBlock: entity.isConfirmingBlock,
      canBlock: Boolean(target?.block_user_id),
      onClose: () => api.notify("#safety:safetyClose"),
      onFieldSet: (field, value) =>
        api.notify("#safety:safetyFieldSet", { field, value }),
      onReport: () =>
        api.notify("#safety:reportSend", {
          target_type: target.type,
          target_id: target.id,
          reason: entity.reason,
          details: entity.details,
        }),
      onBlockAsk: () => api.notify("#safety:blockAsk"),
      onBlock: () => api.notify("#safety:blockSend", target.block_user_id),
      onBlockCancel: () => api.notify("#safety:blockCancel"),
    })
  },
}

export { SafetyButton } from "./template.js"
