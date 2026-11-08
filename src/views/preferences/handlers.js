import { handleAsync } from "@inglorious/store/async"

import { errorKey } from "../../api/errors.js"
import { fetchMyPreferences, savePreferences } from "../../api/preferences.js"
import { fetchMyBlocks, unblockUser } from "../../api/safety.js"
import { readUserId } from "../../api/session.js"
import { withMuted } from "../../data/notification-types.js"
import {
  favoriteRegionOptions,
  uniqueRegions,
} from "../../data/regions/resolve.js"

// The new lists themselves: the save runs after this draft is revoked.
export function professionToggle(entity, professionId, api) {
  const professions = toggled(entity.professions, professionId)
  entity.professions = professions
  api.notify(`#${entity.id}:save`, { professions })
}

export function settingToggle(entity, settingId, api) {
  const interested_settings = toggled(entity.interested_settings, settingId)
  entity.interested_settings = interested_settings
  api.notify(`#${entity.id}:save`, { interested_settings })
}

export function favoriteRegionsSet(entity, { value }, api) {
  const favorite_regions = uniqueRegions(value)
  entity.favorite_regions = favorite_regions
  favoriteOptionsSync(entity, null, api)
  api.notify(`#${entity.id}:save`, { favorite_regions })
}

// The stored lists are the opt-outs. The new list itself: the save runs after
// this draft is revoked.
export function notificationToggle(entity, { column, type, isReceiving }, api) {
  const muted = withMuted([...entity[column]], type, isReceiving)
  entity[column] = muted
  api.notify(`#${entity.id}:save`, { [column]: muted })
}

export function favoriteOptionsSync(entity, _, api) {
  const regions = api.getEntity("jobList")?.regions ?? []
  api.notify("#favoriteRegionPreferences:valueSet", [
    ...entity.favorite_regions,
  ])
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
    entity.interested_settings = preferences.interested_settings ?? []
    entity.professions = preferences.professions ?? []
    entity.favorite_regions = preferences.favorite_regions ?? []
    entity.muted_email_types = preferences.muted_email_types ?? []
    entity.muted_push_types = preferences.muted_push_types ?? []
    favoriteOptionsSync(entity, null, api)
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.loadPreferences")
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
      fields.interested_settings ||
      fields.professions ||
      fields.favorite_regions
    ) {
      api.notify("#jobList:load")
    }
  },
  error(entity, err, api) {
    entity.saveError = errorKey(err, "errors.savePreferences")
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
    api.notify("#jobList:load")
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

function toggled(list, value) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}
