import { handleAsync } from "@inglorious/store/async"

import { fetchMyApplications } from "../../api/applications.js"

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
