import { handleRequest } from "@inglorious/store/async"

import { errorKey } from "../../api/errors.js"
import { deleteJob, fetchMyJobs } from "../../api/jobs.js"

export function deleteAsk(entity, job_id) {
  entity.confirmingDelete = job_id
  entity.removeError = null
}

export function deleteCancel(entity) {
  entity.confirmingDelete = null
}

export const load = handleRequest(
  "load",
  {
    run() {
      return fetchMyJobs()
    },
    success(entity, jobs) {
      entity.jobs = jobs
    },
  },
  { toError: (error) => errorKey(error, "errors.loadJobs") },
)

export const jobRemove = handleRequest(
  "jobRemove",
  {
    run(job_id) {
      return deleteJob(job_id)
    },
    success(entity, _, api) {
      entity.confirmingDelete = null
      api.notify(`#${entity.id}:load`)
    },
  },
  {
    status: "removeStatus",
    error: "removeError",
    toError: (error) => errorKey(error, "errors.deleteJob"),
  },
)
