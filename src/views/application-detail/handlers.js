import { handleRequest } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { answerAgreement, answerSettlement } from "../../api/agreements.js"
import {
  fetchApplicationDetail,
  updateMotivation,
  withdrawApplication,
} from "../../api/applications.js"
import { errorKey } from "../../api/errors.js"
import { paths } from "../../routes.js"

export function fieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: field, value })
  entity.error = null
}

export function withdrawAsk(entity) {
  entity.isConfirmingWithdraw = true
}

export function withdrawCancel(entity) {
  entity.isConfirmingWithdraw = false
}

export const load = handleRequest(
  "load",
  {
    run(application_id) {
      return fetchApplicationDetail(application_id)
    },
    success(entity, application) {
      entity.application = application
      // Realtime reloads keep what the user is typing.
      if (entity.isPristine) entity.values.motivation = application.motivation
    },
  },
  { toError: (error) => errorKey(error, "errors.loadApplication") },
)

export const save = handleRequest(
  "save",
  {
    run({ application_id, motivation }) {
      return updateMotivation(application_id, motivation)
    },
    success(entity, _, api) {
      api.notify("#router:navigate", paths.applications)
    },
  },
  { status: "saveStatus", toError: (error) => errorKey(error, "errors.save") },
)

const dealError = {
  status: "dealStatus",
  error: "dealError",
  toError: () => "errors.update",
}

export const dealAnswer = handleRequest(
  "dealAnswer",
  {
    run({ application_id, isConfirmed }) {
      return answerAgreement(application_id, isConfirmed)
    },
    success(entity, _, api) {
      api.notify(`#${entity.id}:load`, entity.application_id)
    },
  },
  dealError,
)

export const dealSettle = handleRequest(
  "dealSettle",
  {
    run({ application_id, isSettled }) {
      return answerSettlement(application_id, isSettled)
    },
    success(entity, _, api) {
      api.notify(`#${entity.id}:load`, entity.application_id)
    },
  },
  dealError,
)

export const withdraw = handleRequest(
  "withdraw",
  {
    run(application_id) {
      return withdrawApplication(application_id)
    },
    success(entity, _, api) {
      entity.isConfirmingWithdraw = false
      api.notify("#jobList:load")
      api.notify("#router:navigate", paths.applications)
    },
  },
  {
    status: "withdrawStatus",
    toError: (error) => errorKey(error, "errors.withdraw"),
  },
)
