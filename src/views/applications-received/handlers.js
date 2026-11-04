import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { answerSettlement, proposeAgreement } from "../../api/agreements.js"
import { fetchApplicants } from "../../api/applications.js"
import { supabase } from "../../api/client.js"
import { errorKey } from "../../api/errors.js"
import {
  fetchProfileReviews,
  fetchProfileStats,
  submitJobReview,
} from "../../api/reputation.js"
import { jobTypeLabel } from "../../common/job-card/index.js"
import {
  DATETIME_LOCAL_LENGTH,
  FIRST_INDEX,
  MIN_PHOTOS_TO_NAVIGATE,
  NO_RATING,
  REQUEST_TIMEOUT_MS,
} from "../../constants/index.js"
import { canonicalRegion } from "../../data/regions/resolve.js"
import { emptyReview, isReviewDue } from "./helpers.js"

export function expandToggle(entity, application_id) {
  entity.expanded_application_id =
    entity.expanded_application_id === application_id ? null : application_id
  entity.confirming_assign = null
}

export function photoOpen(entity, index) {
  entity.photoIndex = index ?? FIRST_INDEX
  entity.isPhotoPreviewOpen = true
}

export function photoClose(entity) {
  entity.isPhotoPreviewOpen = false
}

export function photoStep(entity, delta) {
  if (!entity.isPhotoPreviewOpen) return
  const urls = entity.job_recap?.image_urls ?? []
  const n = urls.length
  if (n < MIN_PHOTOS_TO_NAVIGATE) return
  entity.photoIndex = ((entity.photoIndex ?? FIRST_INDEX) + delta + n) % n
}

export function reviewFieldSet(entity, { field, value }) {
  entity.review[field] = value
  entity.review.error = null
}

export function reviewSubmit(entity, application_id, api) {
  const { outcome, rating, comment } = entity.review
  if (outcome === "completed" && rating === NO_RATING) {
    entity.review.error = "reputation.ratingRequired"
    return
  }
  api.notify(`#${entity.id}:jobReview`, {
    application_id,
    outcome,
    rating,
    comment,
  })
}

export function assignAsk(entity, application_id) {
  entity.confirming_assign = application_id
  entity.assign_amount =
    entity.pay?.kind === "fixed" ? String(entity.pay.amount_min) : ""
  entity.confirming_reopen = false
}

export function assignAmountSet(entity, value) {
  entity.assign_amount = value ?? ""
}

export function dealDraftSet(entity, value) {
  entity.deal_draft = value ?? ""
}

export function assignCancel(entity) {
  entity.confirming_assign = null
}

export function reopenAsk(entity) {
  entity.confirming_reopen = true
  entity.reopen_deadline = ""
  entity.confirming_assign = null
  clearReopenError(entity)
}

export function reopenCancel(entity) {
  entity.confirming_reopen = false
  entity.reopen_deadline = ""
  clearReopenError(entity)
}

export function reopenDeadlineSet(entity, value) {
  entity.reopen_deadline = value ?? ""
  entity.error = null
  clearReopenError(entity)
}

export function reopenSubmit(entity, _, api) {
  entity.values = { reopen_deadline: entity.reopen_deadline ?? "" }
  Form.validate(entity, { validate: validateReopen })
  if (!entity.isValid) return
  entity.error = null
  api.notify(`#${entity.id}:jobReopen`, {
    job_id: entity.job_id,
    application_deadline: entity.values.reopen_deadline || undefined,
  })
}

export const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run(job_id) {
    if (!job_id) throw new Error("errors.noJobForApplications")

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(
        "id, category, title, profession, status, max_applicants, application_deadline, location, country, region, job_date, created_at, image_urls, details, job_pay(kind, amount_min, amount_max, currency)",
      )
      .eq("id", job_id)
      .single()
    if (jobError) throw jobError
    const { data: items, error } = await supabase
      .from("applications")
      .select(
        "id, status, motivation, created_at, applicant_id, job_reviews(outcome, rating, comment), job_agreements(amount, currency, status), job_settlements(role, is_settled)",
      )
      .eq("job_id", job_id)
      .neq("status", "withdrawn")
      .order("created_at", { ascending: true })
      .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
    if (error) throw error
    const applicantIds = items.map((item) => item.applicant_id).filter(Boolean)
    const [stats, reviews, applicants] = await Promise.all([
      fetchProfileStats(applicantIds),
      fetchProfileReviews(applicantIds),
      fetchApplicants(items.map((item) => item.id)),
    ])
    return {
      job,
      items: items.map((item) => ({
        ...item,
        applicant: applicants[item.id] ?? null,
        stats: stats[item.applicant_id] ?? null,
        reviews: reviews[item.applicant_id] ?? [],
      })),
    }
  },
  success(entity, { job, items }) {
    entity.status = "ready"
    entity.job_title = job.title
    entity.pay = job.job_pay ?? null
    entity.job_status = job.status
    entity.job_deadline = job.application_deadline
    entity.max_applicants = job.max_applicants
    entity.job_recap = {
      status: job.status,
      jobType: jobTypeLabel(job),
      location: [job.location, canonicalRegion(job.region), job.country]
        .filter(Boolean)
        .join(", "),
      job_date: job.job_date,
      application_deadline: job.application_deadline,
      created_at: job.created_at,
      image_urls: [...(job.image_urls ?? [])],
      names:
        job.details?.spouse_first_name_1 && job.details?.spouse_first_name_2
          ? `${job.details.spouse_first_name_1} & ${job.details.spouse_first_name_2}`
          : (job.details?.headliner ?? null),
      style: job.details?.style ?? job.details?.genre ?? null,
    }
    entity.items = items
    const due = items.find((item) => isReviewDue(item, job.job_date))
    if (due) entity.expanded_application_id ??= due.id
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.loadApplications")
  },
})

export const statusSet = handleAsync("statusSet", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ application_id, status }) {
    const { error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", application_id)
    if (error) throw error
    return { application_id, status }
  },
  // Applied at once: realtime reloads the list too, but can lag or drop
  // (Android WebView).
  success(entity, { application_id, status }) {
    entity.status = "ready"
    entity.items = entity.items.map((item) =>
      item.id === application_id ? { ...item, status } : item,
    )
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.update")
  },
})

export const dealPropose = handleAsync("dealPropose", {
  start(entity) {
    entity.isDealBusy = true
    entity.dealError = null
  },
  run({ application_id, amount }) {
    return proposeAgreement(application_id, Number(amount))
  },
  success(entity, _, api) {
    entity.isDealBusy = false
    entity.deal_draft = ""
    api.notify(`#${entity.id}:load`, entity.job_id)
  },
  error(entity) {
    entity.isDealBusy = false
    entity.dealError = "errors.update"
  },
})

export const dealSettle = handleAsync("dealSettle", {
  start(entity) {
    entity.isDealBusy = true
    entity.dealError = null
  },
  run({ application_id, isSettled }) {
    return answerSettlement(application_id, isSettled)
  },
  success(entity, _, api) {
    entity.isDealBusy = false
    api.notify(`#${entity.id}:load`, entity.job_id)
  },
  error(entity) {
    entity.isDealBusy = false
    entity.dealError = "errors.update"
  },
})

export const jobReview = handleAsync("jobReview", {
  start(entity) {
    entity.review.status = "saving"
    entity.review.error = null
  },
  run(fields) {
    return submitJobReview(fields)
  },
  success(entity, _, api) {
    entity.review = emptyReview()
    api.notify(`#${entity.id}:load`, entity.job_id)
  },
  error(entity, err) {
    entity.review.status = "idle"
    entity.review.error = errorKey(err, "errors.saveReview")
  },
})

export const winnerAssign = handleAsync("winnerAssign", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ job_id, application_id, amount }) {
    const { error } = await supabase.rpc("assign_winner", {
      p_job_id: job_id,
      p_application_id: application_id,
      p_agreed_amount: amount === "" ? null : Number(amount),
    })
    if (error) throw error
    return job_id
  },
  success(entity, job_id, api) {
    entity.status = "ready"
    entity.confirming_assign = null
    api.notify(`#${entity.id}:load`, job_id)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.assignWinner")
  },
})

export const jobReopen = handleAsync("jobReopen", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ job_id, application_deadline }) {
    const patch = { status: "open" }
    if (application_deadline) {
      const iso =
        application_deadline.length === DATETIME_LOCAL_LENGTH
          ? new Date(application_deadline).toISOString()
          : application_deadline
      if (new Date(iso).getTime() <= Date.now()) {
        throw new Error("validation.futureDeadline")
      }
      patch.application_deadline = iso
    }
    const { error } = await supabase.from("jobs").update(patch).eq("id", job_id)
    if (error) throw error
    return job_id
  },
  success(entity, job_id, api) {
    entity.status = "ready"
    entity.confirming_reopen = false
    entity.reopen_deadline = ""
    api.notify(`#${entity.id}:load`, job_id)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.reopenJob")
  },
})

export function clearReopenError(entity) {
  if (!entity.errors) return
  entity.errors.reopen_deadline = null
  entity.isValid = true
}

function validateReopen(values) {
  const errors = {}
  const value = values.reopen_deadline
  if (!value) return errors
  const iso =
    value.length === DATETIME_LOCAL_LENGTH
      ? new Date(value).toISOString()
      : value
  if (new Date(iso).getTime() <= Date.now()) {
    errors.reopen_deadline = "validation.futureDeadline"
  }
  return errors
}
