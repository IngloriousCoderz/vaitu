import { handleAsync } from "@inglorious/store/async"

import { errorKey } from "../../api/errors.js"
import { deleteJob, fetchMyJobs } from "../../api/jobs.js"

export function deleteAsk(entity, job_id) {
  entity.confirmingDelete = job_id
}

export function deleteCancel(entity) {
  entity.confirmingDelete = null
}

export const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run() {
    return fetchMyJobs()
  },
  success(entity, jobs) {
    entity.status = "ready"
    entity.jobs = jobs
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.loadJobs")
  },
})

export const jobRemove = handleAsync("jobRemove", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  run(job_id) {
    return deleteJob(job_id)
  },
  success(entity, _, api) {
    entity.status = "ready"
    entity.confirmingDelete = null
    api.notify(`#${entity.id}:load`)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.deleteJob")
  },
})
