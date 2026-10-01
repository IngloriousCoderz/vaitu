import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplications } from "../../api/applications.js"

export function open(entity, status_filter, api) {
  entity.isOpen = true
  entity.status_filter = status_filter ?? "all"
  api.notify(`#${entity.id}:loadApplications`)
}

export function close(entity) {
  entity.isOpen = false
  entity.status = "idle"
  entity.error = null
}

export function closeOverlays(entity) {
  close(entity)
}

export function selectStatusFilter(entity, status_filter) {
  entity.status_filter = status_filter
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
