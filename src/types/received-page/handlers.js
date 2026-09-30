import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"

export function open(entity, event_id, api) {
  entity.event_id = event_id
  entity.event_title = ""
  entity.max_applicants = 5
  entity.items = []
  entity.expanded_application_id = null
  api.notify(`#${entity.id}:loadReceived`, event_id)
}

export function close(entity) {
  entity.event_id = null
  entity.event_title = ""
  entity.items = []
  entity.expanded_application_id = null
  entity.status = "idle"
  entity.error = null
}

export function toggleExpand(entity, application_id) {
  entity.expanded_application_id =
    entity.expanded_application_id === application_id ? null : application_id
}

export const loadReceived = handleAsync("loadReceived", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run(event_id) {
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, max_applicants")
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
      .abortSignal(AbortSignal.timeout(15000))
    if (error) throw error
    return { event, items }
  },
  success(entity, { event, items }) {
    entity.status = "ready"
    entity.event_title = event.title
    entity.max_applicants = event.max_applicants
    entity.items = items
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load applications"
  },
})

export const setStatus = handleAsync("setStatus", {
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
  success(entity, event_id, api) {
    entity.status = "ready"
    api.notify(`#${entity.id}:loadReceived`, event_id)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to update"
  },
})
