import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplications } from "../../api/applications.js"

export function open(entity, _, api) {
  entity.isOpen = true
  api.notify(`#${entity.id}:loadApplications`)
}

export function close(entity) {
  entity.isOpen = false
  entity.status = "idle"
  entity.error = null
}

export const loadApplications = handleAsync("loadApplications", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run() {
    return fetchMyApplications()
  },
  success(entity, applications) {
    entity.status = "ready"
    entity.applications = applications
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load applications"
  },
})
