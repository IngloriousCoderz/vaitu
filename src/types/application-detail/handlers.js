import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import {
  fetchApplicationDetail,
  giveUpApplication,
  updateMotivation,
  withdrawApplication,
} from "../../api/applications.js"
import { paths } from "../../routes.js"

export function fieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: field, value })
  entity.error = null
}

export function withdrawAsk(entity) {
  entity.isConfirmingWithdraw = true
}

export function giveUpAsk(entity) {
  entity.isConfirmingGiveUp = true
}

export function giveUpCancel(entity) {
  entity.isConfirmingGiveUp = false
}

export function withdrawCancel(entity) {
  entity.isConfirmingWithdraw = false
}

export const applicationLoad = handleAsync("applicationLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run(application_id) {
    return fetchApplicationDetail(application_id)
  },
  success(entity, application) {
    entity.status = "ready"
    entity.application = application
    entity.values.motivation = application.motivation
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load application"
  },
})

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  run({ application_id, motivation }) {
    return updateMotivation(application_id, motivation)
  },
  success(entity, _, api) {
    entity.status = "ready"
    api.notify("#router:navigate", paths.applications)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to save"
  },
})

export const withdraw = handleAsync("withdraw", {
  start(entity) {
    entity.status = "withdrawing"
    entity.error = null
  },
  run(application_id) {
    return withdrawApplication(application_id)
  },
  success(entity, _, api) {
    entity.status = "ready"
    entity.isConfirmingWithdraw = false
    api.notify("#eventList:eventsLoad")
    api.notify("#router:navigate", paths.applications)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to withdraw"
  },
})

export const giveUp = handleAsync("giveUp", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  run(application_id) {
    return giveUpApplication(application_id)
  },
  success(entity, _, api) {
    entity.status = "ready"
    entity.isConfirmingGiveUp = false
    api.notify("#router:navigate", paths.applications)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to give up"
  },
})
