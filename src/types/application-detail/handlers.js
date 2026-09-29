import { handleAsync } from "@inglorious/store/async"

import {
  fetchApplicationDetail,
  updateMotivation,
  withdrawApplication,
} from "../../api/applications.js"

export function open(entity, application_id, api) {
  entity.application_id = application_id
  entity.application = null
  entity.motivation = ""
  entity.confirming_withdraw = false
  api.notify(`#${entity.id}:loadApplication`, application_id)
}

export function close(entity) {
  entity.application_id = null
  entity.application = null
  entity.status = "idle"
  entity.error = null
}

export function setField(entity, { field, value }) {
  entity[field] = value
}

export function askWithdraw(entity) {
  entity.confirming_withdraw = true
}

export function cancelWithdraw(entity) {
  entity.confirming_withdraw = false
}

export const loadApplication = handleAsync("loadApplication", {
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
    entity.motivation = application.motivation
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
    api.notify("#applications:open")
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
    entity.confirming_withdraw = false
    api.notify(`#${entity.id}:close`)
    api.notify("#applications:open")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to withdraw"
  },
})
