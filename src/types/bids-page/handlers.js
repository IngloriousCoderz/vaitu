import { handleAsync } from "@inglorious/store/async"

import { fetchMyBids } from "../../api/applications.js"

export function open(entity, _, api) {
  entity.open = true
  api.notify(`#${entity.id}:loadBids`)
}

export function close(entity) {
  entity.open = false
  entity.status = "idle"
  entity.error = null
}

export const loadBids = handleAsync("loadBids", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run() {
    return fetchMyBids()
  },
  success(entity, bids) {
    entity.status = "ready"
    entity.bids = bids
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load applications"
  },
})
