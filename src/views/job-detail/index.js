import { Form } from "@inglorious/web/form"
import { pageRouteChange } from "@inglorious/web/router"

import { readUserId } from "../../api/session.js"
import { stopTick } from "../../api/ticker.js"
import { isProfileComplete } from "../../common/profile.js"
import { paths } from "../../routes.js"
import * as handlers from "./handlers.js"
import { JobDetail as renderers } from "./template.js"

const { apply, load, ...syncHandlers } = handlers

export const JobDetail = {
  ...Form,
  ...syncHandlers,
  ...apply,
  ...load,
  ...renderers,

  create(entity) {
    entity.job_id ??= null
    entity.job ??= null
    entity.senderName ??= null
    entity.organizerStats ??= null
    entity.status ??= "idle"
    entity.error ??= null
    entity.initialValues = {
      full_name: "",
      website: "",
      phone: "",
      motivation: "",
    }
    Form.create(entity)
    entity.isSubmitted ??= false
    entity.applyStatus ??= "idle"
    entity.applyError ??= null
    entity.photoIndex ??= 0
    entity.isPhotoPreviewOpen ??= false
  },

  applySubmit(entity, _, api) {
    Form.validate(entity, { validate: validateApply })
    if (!entity.isValid) return
    entity.applyError = null
    api.notify(`#${entity.id}:applicationSubmit`)
  },

  routeChange: pageRouteChange({
    select: (payload) => payload.params.jobId,
    open,
    close,
  }),

  renderHeader(entity) {
    return {
      title: entity.job?.title ?? "",
      back: entity.job?.senderId === readUserId() ? paths.myJobs : paths.jobs,
    }
  },

  render(entity, api) {
    const id = entity.id
    return this.renderJobDetail(
      {
        entity,
        profileComplete: isProfileComplete(api.getEntity("profile").profile),
        onOpenJobs: () => api.notify("#router:navigate", paths.jobs),
        onField: ({ field, value }) =>
          api.notify(`#${id}:fieldSet`, { field, value }),
        onSubmit: () => api.notify(`#${id}:applySubmit`),
        onCompleteProfile: () => api.notify("#router:navigate", paths.profile),
        onPhotoOpen: (index) => api.notify(`#${id}:photoOpen`, index),
        onPhotoClose: () => api.notify(`#${id}:photoClose`),
        onPhotoStep: (delta) => api.notify(`#${id}:photoStep`, delta),
        onReport:
          entity.job && entity.job.senderId !== readUserId()
            ? () =>
                api.notify("#safety:safetyOpen", {
                  type: "job",
                  id: entity.job.id,
                  block_user_id: entity.job.senderId,
                })
            : undefined,
        onOpenApplications:
          entity.job?.senderId === readUserId()
            ? () =>
                api.notify(
                  "#router:navigate",
                  paths.receivedApplications(entity.job.id),
                )
            : undefined,
      },
      api,
    )
  },
}

function validateApply(values) {
  const errors = {}
  if (!(values.motivation ?? "").trim()) {
    errors.motivation = "validation.motivationRequired"
  }
  return errors
}

function open(entity, job_id, api) {
  stopTick("clock")
  entity.job_id = job_id
  entity.job = null
  entity.senderName = null
  entity.organizerStats = null
  entity.status = "idle"
  entity.error = null
  entity.isSubmitted = false
  entity.applyStatus = "idle"
  entity.applyError = null
  entity.photoIndex = 0
  entity.isPhotoPreviewOpen = false
  Form.reset(entity)
  const profile = api.getEntity("profile").profile
  entity.values.full_name = profile?.full_name ?? ""
  entity.values.website = profile?.website ?? ""
  entity.values.phone = profile?.phone ?? ""
  api.notify(`#${entity.id}:load`, job_id)
}

function close(entity) {
  stopTick("clock")
  entity.job_id = null
  entity.job = null
  entity.senderName = null
  entity.status = "idle"
  entity.error = null
  entity.isSubmitted = false
  entity.applyError = null
  entity.photoIndex = 0
  entity.isPhotoPreviewOpen = false
  Form.reset(entity)
}
