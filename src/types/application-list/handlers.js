import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplications } from "../../api/applications.js"
import { registerRealtime, unregisterRealtime } from "../../realtime.js"

export function open(entity, status_filter, api) {
  entity.isOpen = true
  entity.status_filter = status_filter ?? "all"
  registerRealtime("applications", {
    table: "applications",
    event: `#${entity.id}:applicationsLoad`,
  })
  api.notify(`#${entity.id}:applicationsLoad`)
}

export function close(entity) {
  unregisterRealtime("applications")
  entity.isOpen = false
  entity.status = "idle"
  entity.error = null
}

export function overlaysClose(entity) {
  close(entity)
}

export function statusFilterSelect(entity, status_filter) {
  entity.status_filter = status_filter
}

export const applicationsLoad = handleAsync("applicationsLoad", {
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
