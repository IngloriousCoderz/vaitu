import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import {
  DATETIME_LOCAL_LENGTH,
  REQUEST_TIMEOUT_MS,
} from "../../constants/index.js"
import { canonicalRegion } from "../../data/regions/resolve.js"

export function expandToggle(entity, application_id) {
  entity.expanded_application_id =
    entity.expanded_application_id === application_id ? null : application_id
  entity.confirming_assign = null
}

export function assignAsk(entity, application_id) {
  entity.confirming_assign = application_id
  entity.confirming_reopen = false
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
  api.notify(`#${entity.id}:eventReopen`, {
    event_id: entity.event_id,
    application_deadline: entity.values.reopen_deadline || undefined,
  })
}

export const receivedLoad = handleAsync("receivedLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run(event_id) {
    /* Realtime can fire this after the page has been left, when there is no
       event to load. `.eq("id", undefined)` is a malformed filter that comes
       back as a 400, so bail rather than ask. */
    if (!event_id) throw new Error("No event to load applications for")

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        "id, title, status, max_applicants, application_deadline, location, country, region, event_date, created_at, details",
      )
      .eq("id", event_id)
      .single()
    if (eventError) throw eventError
    const { data: items, error } = await supabase
      .from("applications")
      .select(
        "id, status, motivation, created_at, applicant:profiles!applications_applicant_id_fkey(full_name, website, instagram_handle, country)",
      )
      .eq("event_id", event_id)
      .order("created_at", { ascending: true })
      .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
    if (error) throw error
    return { event, items }
  },
  success(entity, { event, items }) {
    entity.status = "ready"
    entity.event_title = event.title
    entity.event_status = event.status
    entity.event_deadline = event.application_deadline
    entity.max_applicants = event.max_applicants
    entity.event_recap = {
      status: event.status,
      location: [event.location, canonicalRegion(event.region), event.country]
        .filter(Boolean)
        .join(", "),
      event_date: event.event_date,
      application_deadline: event.application_deadline,
      created_at: event.created_at,
      names:
        event.details?.spouse_first_name_1 && event.details?.spouse_first_name_2
          ? `${event.details.spouse_first_name_1} & ${event.details.spouse_first_name_2}`
          : (event.details?.headliner ?? null),
      style: event.details?.style ?? event.details?.genre ?? null,
    }
    entity.items = items
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load applications"
  },
})

export const statusSet = handleAsync("statusSet", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ application_id, status, event_id }) {
    const { error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", application_id)
    if (error) throw error
    return event_id
  },
  success(entity) {
    // List refreshes via realtime; a manual reload here double-fires.
    entity.status = "ready"
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to update"
  },
})

export const winnerAssign = handleAsync("winnerAssign", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ event_id, application_id }) {
    const { error } = await supabase.rpc("assign_winner", {
      p_event_id: event_id,
      p_application_id: application_id,
    })
    if (error) throw error
    return event_id
  },
  success(entity) {
    entity.status = "ready"
    entity.confirming_assign = null
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to assign winner"
  },
})

export const eventReopen = handleAsync("eventReopen", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ event_id, application_deadline }) {
    const patch = { status: "open" }
    if (application_deadline) {
      const iso =
        application_deadline.length === DATETIME_LOCAL_LENGTH
          ? new Date(application_deadline).toISOString()
          : application_deadline
      if (new Date(iso).getTime() <= Date.now()) {
        throw new Error("Pick a future deadline")
      }
      patch.application_deadline = iso
    }
    const { error } = await supabase
      .from("events")
      .update(patch)
      .eq("id", event_id)
    if (error) throw error
    return event_id
  },
  success(entity) {
    entity.status = "ready"
    entity.confirming_reopen = false
    entity.reopen_deadline = ""
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to reopen event"
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
    errors.reopen_deadline = "Pick a future deadline"
  }
  return errors
}
