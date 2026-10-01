import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"
import { REQUEST_TIMEOUT_MS } from "../../constants.js"

export function open(entity, event_id, api) {
  entity.event_id = event_id
  entity.event_title = ""
  entity.max_applicants = 5
  entity.items = []
  entity.expanded_application_id = null
  entity.confirming_assign = null
  api.notify(`#${entity.id}:loadReceived`, event_id)
}

export function close(entity) {
  entity.event_id = null
  entity.event_title = ""
  entity.event_status = "open"
  entity.items = []
  entity.expanded_application_id = null
  entity.confirming_assign = null
  entity.confirming_reopen = false
  entity.status = "idle"
  entity.error = null
}

export function closeOverlays(entity) {
  close(entity)
}

export function toggleExpand(entity, application_id) {
  entity.expanded_application_id =
    entity.expanded_application_id === application_id ? null : application_id
  entity.confirming_assign = null
}

export function askAssign(entity, application_id) {
  entity.confirming_assign = application_id
  entity.confirming_reopen = false
}

export function cancelAssign(entity) {
  entity.confirming_assign = null
}

export function askReopen(entity) {
  entity.confirming_reopen = true
  entity.confirming_assign = null
}

export function cancelReopen(entity) {
  entity.confirming_reopen = false
}

export const loadReceived = handleAsync("loadReceived", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run(event_id) {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, status, max_applicants")
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
    entity.max_applicants = event.max_applicants
    entity.items = items
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load applications"
  },
})

export const setStatus = handleAsync("setStatus", {  start(entity) {
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
  success(entity, event_id, api) {
    entity.status = "ready"
    api.notify(`#${entity.id}:loadReceived`, event_id)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to update"
  },
})

export const assignWinner = handleAsync("assignWinner", {
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
  success(entity, event_id, api) {
    entity.status = "ready"
    entity.confirming_assign = null
    api.notify(`#${entity.id}:loadReceived`, event_id)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to assign winner"
  },
})

export const reopenEvent = handleAsync("reopenEvent", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run(event_id) {
    const { error } = await supabase
      .from("events")
      .update({ status: "open" })
      .eq("id", event_id)
    if (error) throw error
    return event_id
  },
  success(entity, event_id, api) {
    entity.status = "ready"
    entity.confirming_reopen = false
    api.notify(`#${entity.id}:loadReceived`, event_id)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to reopen event"
  },
})
