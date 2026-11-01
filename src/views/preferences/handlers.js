import { handleAsync } from "@inglorious/store/async"

import { fetchMyPreferences, savePreferences } from "../../api/preferences.js"
import { fetchMyBlocks, unblockUser } from "../../api/safety.js"
import { readUserId } from "../../api/session.js"
import { interestsFor, jobTypesFor } from "../../data/event-taxonomy.js"
import {
  favoriteRegionOptions,
  uniqueRegions,
} from "../../data/regions/resolve.js"

// The new list itself: the save runs after this draft is revoked.
export function jobTypesSet(entity, { value }, api) {
  entity.interested_job_types = value
  api.notify(`#${entity.id}:save`, { interested_job_types: value })
}

export function professionToggle(entity, professionId, api) {
  const professions = entity.professions.includes(professionId)
    ? entity.professions.filter((id) => id !== professionId)
    : [...entity.professions, professionId]
  const interested_job_types = interestsFor(
    entity.interested_job_types,
    professions,
  )
  entity.professions = professions
  entity.interested_job_types = interested_job_types
  jobTypesSync(entity, professions, interested_job_types, api)
  api.notify(`#${entity.id}:save`, { professions, interested_job_types })
}

export function favoriteRegionsSet(entity, { value }, api) {
  const favorite_regions = uniqueRegions(value)
  entity.favorite_regions = favorite_regions
  favoriteOptionsSync(entity, null, api)
  api.notify(`#${entity.id}:save`, { favorite_regions })
}

// On means the user gets emails: the stored flag is the opt-out.
export function emailsSet(entity, isReceiving, api) {
  entity.is_email_opted_out = !isReceiving
  api.notify(`#${entity.id}:save`, {
    is_email_opted_out: entity.is_email_opted_out,
  })
}

export function newEventAlertsSet(entity, isReceiving, api) {
  entity.has_new_event_alerts = isReceiving
  api.notify(`#${entity.id}:save`, { has_new_event_alerts: isReceiving })
}

export function favoriteOptionsSync(entity, _, api) {
  const regions = api.getEntity("eventList")?.regions ?? []
  api.notify("#favoriteRegionPreferences:sync", [...entity.favorite_regions])
  api.notify(
    "#favoriteRegionPreferences:optionsSet",
    favoriteRegionOptions(regions, entity.favorite_regions),
  )
}

export const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const [preferences, blocks] = await Promise.all([
      fetchMyPreferences(),
      fetchMyBlocks(),
    ])
    return { ...preferences, blocks }
  },
  success(entity, preferences, api) {
    entity.status = "ready"
    entity.blocks = preferences.blocks
    entity.interested_job_types = preferences.interested_job_types ?? []
    entity.professions = preferences.professions ?? []
    jobTypesSync(
      entity,
      [...entity.professions],
      [...entity.interested_job_types],
      api,
    )
    entity.favorite_regions = preferences.favorite_regions ?? []
    entity.is_email_opted_out = preferences.is_email_opted_out ?? false
    entity.has_new_event_alerts = preferences.has_new_event_alerts ?? true
    favoriteOptionsSync(entity, null, api)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "errors.loadPreferences"
  },
})

export const save = handleAsync("save", {
  start(entity) {
    entity.saveError = null
  },
  run(fields) {
    return savePreferences(fields)
  },
  success(entity, fields, api) {
    if (
      fields.interested_job_types ||
      fields.professions ||
      fields.favorite_regions
    ) {
      api.notify("#eventList:load")
    }
  },
  error(entity, err, api) {
    entity.saveError = err.message ?? "errors.savePreferences"
    api.notify(`#${entity.id}:load`)
  },
})

export const unblock = handleAsync("unblock", {
  start(entity) {
    entity.saveError = null
  },
  async run(user_id) {
    await unblockUser(user_id)
    return user_id
  },
  success(entity, user_id, api) {
    entity.blocks = entity.blocks.filter(
      (block) => block.blocked_id !== user_id,
    )
    api.notify("#eventList:load")
  },
  error(entity) {
    entity.saveError = "safety.unblockFailed"
  },
})

export const localeSave = handleAsync("localeSave", {
  run(locale) {
    return readUserId() ? savePreferences({ locale }) : null
  },
  error(_, err) {
    console.warn("[preferences] language not saved:", err)
  },
})

function jobTypesSync(entity, professions, interests, api) {
  api.notify("#jobTypesPreferences:optionsSet", jobTypesFor(professions))
  api.notify("#jobTypesPreferences:sync", interests)
}
