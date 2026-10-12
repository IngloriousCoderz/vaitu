import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import {
  fetchApplicationDetail,
  giveUpApplication,
  updateMotivation,
  withdrawApplication,
} from "../../api/applications.js"

export function open(entity, { application_id, returnTo }, api) {
  entity.application_id = application_id
  entity.returnTo = returnTo ?? "applications"
  entity.application = null
  if (entity.values) entity.values.motivation = ""
  entity.isConfirmingWithdraw = false
  api.notify(`#${entity.id}:applicationLoad`, application_id)
}

export function back(entity, _, api) {
  const returnTo = entity.returnTo ?? "applications"
  api.notify(`#${entity.id}:close`)
  if (returnTo === "applications") api.notify("#applicationList:open")
}

export function close(entity) {
  entity.application_id = null
  entity.application = null
  entity.status = "idle"
  entity.error = null
}

export function overlaysClose(entity) {
  close(entity)
}

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
    api.notify(`#${entity.id}:close`)
    api.notify("#applicationList:open")
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
    api.notify(`#${entity.id}:close`)
    api.notify("#eventList:eventsLoad")
    api.notify("#applicationList:open")
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
    api.notify(`#${entity.id}:close`)
    api.notify("#applicationList:open")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to give up"
  },
})
