import { Form } from "@inglorious/web/form"
import { pageRouteChange } from "@inglorious/web/router"

import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { clearReopenError } from "./handlers.js"
import { emptyReview } from "./helpers.js"
import { template } from "./template.js"

const {
  load,
  statusSet,
  jobReview,
  dealPropose,
  dealSettle,
  winnerAssign,
  jobReopen,
  ...syncHandlers
} = handlers

export const ApplicationsReceived = {
  ...Form,
  ...syncHandlers,
  ...load,
  ...statusSet,
  ...jobReview,
  ...dealPropose,
  ...dealSettle,
  ...winnerAssign,
  ...jobReopen,
  ...template,

  create(entity) {
    entity.job_id ??= null
    entity.job_title ??= ""
    entity.job_status ??= "open"
    entity.job_deadline ??= null
    entity.job_recap ??= null
    entity.initialValues = { reopen_deadline: "" }
    Form.create(entity)
    entity.reopen_deadline ??= ""
    entity.max_applicants ??= 5
    entity.expanded_application_id ??= null
    entity.confirming_assign ??= null
    entity.confirming_reopen ??= false
    entity.photoIndex ??= 0
    entity.isPhotoPreviewOpen ??= false
    entity.items ??= []
    entity.review ??= emptyReview()
    entity.pay ??= null
    entity.assign_amount ??= ""
    entity.deal_draft ??= ""
    entity.isDealBusy ??= false
    entity.dealError ??= null
    entity.status ??= "idle"
    entity.error ??= null
  },

  routeChange: pageRouteChange({
    select: (payload) => payload.params.jobId,
    open,
    close,
  }),

  renderHeader(entity) {
    const items = entity.items ?? []
    const shortlisted = items.filter(
      (item) => item.status === "shortlisted",
    ).length
    return {
      title: entity.job_title ?? "",
      subtitle: t("received.summary", {
        shortlisted,
        received: items.length,
      }),
      back: paths.myJobs,
    }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderApplicationsReceived(
      {
        entity,
        onToggle: (application_id) =>
          api.notify(`#${id}:expandToggle`, application_id),
        onSelect: (application_id) =>
          api.notify(`#${id}:statusSet`, {
            application_id,
            status: "shortlisted",
          }),
        onReject: (application_id) =>
          api.notify(`#${id}:statusSet`, {
            application_id,
            status: "rejected",
          }),
        onUnshortlist: (application_id) =>
          api.notify(`#${id}:statusSet`, {
            application_id,
            status: "pending",
          }),
        onUnreject: (application_id) =>
          api.notify(`#${id}:statusSet`, {
            application_id,
            status: "pending",
          }),
        onAskAssign: (application_id) =>
          api.notify(`#${id}:assignAsk`, application_id),
        onAssign: (application_id) =>
          api.notify(`#${id}:winnerAssign`, {
            job_id: entity.job_id,
            application_id,
            amount: entity.assign_amount,
          }),
        onCancelAssign: () => api.notify(`#${id}:assignCancel`),
        onAssignAmount: (value) => api.notify(`#${id}:assignAmountSet`, value),
        onDealDraft: (value) => api.notify(`#${id}:dealDraftSet`, value),
        onDealPropose: (application_id) =>
          api.notify(`#${id}:dealPropose`, {
            application_id,
            amount: entity.deal_draft,
          }),
        onDealSettle: (application_id, isSettled) =>
          api.notify(`#${id}:dealSettle`, { application_id, isSettled }),
        onReport: (target) => api.notify("#safety:safetyOpen", target),
        onReviewField: (field, value) =>
          api.notify(`#${id}:reviewFieldSet`, { field, value }),
        onReviewSubmit: (application_id) =>
          api.notify(`#${id}:reviewSubmit`, application_id),
        onAskReopen: () => api.notify(`#${id}:reopenAsk`),
        onReopenDeadline: (value) =>
          api.notify(`#${id}:reopenDeadlineSet`, value),
        onReopen: () => api.notify(`#${id}:reopenSubmit`),
        onCancelReopen: () => api.notify(`#${id}:reopenCancel`),
        onPhotoOpen: (index) => api.notify(`#${id}:photoOpen`, index),
        onPhotoClose: () => api.notify(`#${id}:photoClose`),
        onPhotoStep: (delta) => api.notify(`#${id}:photoStep`, delta),
      },
      api,
    )
  },
}

function open(entity, job_id, api) {
  entity.job_id = job_id
  entity.job_title = ""
  entity.job_deadline = null
  entity.job_recap = null
  entity.reopen_deadline = ""
  entity.confirming_reopen = false
  clearReopenError(entity)
  entity.max_applicants = 5
  entity.items = []
  entity.review = emptyReview()
  entity.pay = null
  entity.assign_amount = ""
  entity.deal_draft = ""
  entity.dealError = null
  entity.expanded_application_id = null
  entity.confirming_assign = null
  entity.photoIndex = 0
  entity.isPhotoPreviewOpen = false
  api.notify(`#${entity.id}:load`, job_id)
}

function close(entity) {
  entity.job_id = null
  entity.job_title = ""
  entity.job_status = "open"
  entity.job_recap = null
  entity.items = []
  entity.expanded_application_id = null
  entity.confirming_assign = null
  entity.confirming_reopen = false
  entity.reopen_deadline = ""
  entity.photoIndex = 0
  entity.isPhotoPreviewOpen = false
  clearReopenError(entity)
  entity.status = "idle"
  entity.error = null
}
