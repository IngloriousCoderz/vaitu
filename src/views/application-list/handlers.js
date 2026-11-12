import { handleRequest } from "@inglorious/store/async"

import { fetchMyApplications } from "../../api/applications.js"
import { errorKey } from "../../api/errors.js"

export function statusFilterSelect(entity, status_filter) {
  entity.status_filter = status_filter
}

export const load = handleRequest(
  "load",
  {
    run() {
      return fetchMyApplications()
    },
    success(entity, applications) {
      entity.applications = applications
    },
  },
  { toError: (error) => errorKey(error, "errors.loadApplications") },
)
