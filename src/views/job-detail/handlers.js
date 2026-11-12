import { handleRequest } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { errorKey } from "../../api/errors.js"
import { fetchJobDetail } from "../../api/jobs.js"
import { fetchProfileStats } from "../../api/reputation.js"
import { readUserId } from "../../api/session.js"
import { startTick } from "../../api/ticker.js"
import {
  DAY_MS,
  FIRST_INDEX,
  MIN_PHOTOS_TO_NAVIGATE,
  NO_TIME_LEFT,
} from "../../constants/index.js"
import { paths } from "../../routes.js"

export function fieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: field, value })
}

export function clockTick(entity) {
  entity.nowTs = Date.now()
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
  const urls = entity.job?.imageUrls ?? []
  const n = urls.length
  if (n < MIN_PHOTOS_TO_NAVIGATE) return
  entity.photoIndex = ((entity.photoIndex ?? FIRST_INDEX) + delta + n) % n
}

export function prefill(entity, profile) {
  if (!profile || !entity.values) return
  if (!getFieldValue(entity, "full_name", "")) {
    entity.values.full_name = profile.full_name ?? ""
  }
  if (!getFieldValue(entity, "website", "")) {
    entity.values.website = profile.website ?? ""
  }
  if (!getFieldValue(entity, "phone", "")) {
    entity.values.phone = profile.phone ?? ""
  }
}

export function applicationSubmit(entity, _, api) {
  if (!readUserId()) {
    api.notify("#router:navigate", paths.login)
    return
  }
  api.notify(`#${entity.id}:apply`, {
    job_id: entity.job_id,
    full_name: entity.values.full_name,
    website: entity.values.website,
    phone: entity.values.phone,
    motivation: entity.values.motivation,
  })
}

export const apply = handleRequest(
  "apply",
  {
    async run({ job_id, full_name, website, phone, motivation }) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("errors.notLoggedIn")
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: full_name.trim(),
          website: website.trim().toLowerCase(),
          phone: phone.trim(),
        })
        .eq("id", user.id)
      if (profileError) throw profileError
      const { error } = await supabase.from("applications").insert({
        job_id,
        applicant_id: user.id,
        motivation: motivation.trim(),
      })
      if (error) {
        if (error.code === "23505") {
          throw new Error("errors.alreadyApplied")
        }
        throw error
      }
      return true
    },
    success(entity, _, api) {
      entity.isSubmitted = true
      api.notify("#jobList:load")
    },
  },
  {
    status: "applyStatus",
    error: "applyError",
    toError: (error) => errorKey(error, "errors.applicationFailed"),
  },
)

export const load = handleRequest(
  "load",
  {
    async run(job_id) {
      const detail = await fetchJobDetail(job_id)
      const { posterId } = detail.job
      const isSomeoneElses = readUserId() && posterId !== readUserId()
      const stats = isSomeoneElses ? await fetchProfileStats([posterId]) : {}
      return { ...detail, posterStats: stats[posterId] ?? null }
    },
    success(entity, { job, posterName, posterStats }, api) {
      entity.job = job
      entity.posterStats = posterStats
      entity.posterName = posterName
      if (needsClock(job)) {
        const id = entity.id
        startTick("clock", () => api.notify(`#${id}:clockTick`))
      }
    },
  },
  { toError: (error) => errorKey(error, "errors.loadJob") },
)

function needsClock(job) {
  if (!job?.application_deadline) return false
  const msLeft = new Date(job.application_deadline).getTime() - Date.now()
  return msLeft > NO_TIME_LEFT && msLeft < DAY_MS
}
