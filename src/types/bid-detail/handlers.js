import { handleAsync } from "@inglorious/store/async"

import {
  fetchBidDetail,
  updateMotivation,
  withdrawApplication,
} from "../../api/applications.js"

export function open(entity, application_id, api) {
  entity.application_id = application_id
  entity.bid = null
  entity.motivation = ""
  entity.confirming_withdraw = false
  api.notify(`#${entity.id}:loadBid`, application_id)
}

export function close(entity) {
  entity.application_id = null
  entity.bid = null
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

export const loadBid = handleAsync("loadBid", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run(application_id) {
    return fetchBidDetail(application_id)
  },
  success(entity, bid) {
    entity.status = "ready"
    entity.bid = bid
    entity.motivation = bid.motivation
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
    api.notify("#bids:open")
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
    api.notify("#bids:open")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to withdraw"
  },
})
