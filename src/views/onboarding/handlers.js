import { handleAsync } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { errorKey } from "../../api/errors.js"
import {
  favoriteRegionOptions,
  uniqueRegions,
} from "../../data/regions/resolve.js"

export function fieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: field, value })
  entity.error = null
}

export function favoriteRegionsSet(entity, { value }, api) {
  Form.fieldChange(entity, {
    path: "favorite_regions",
    value: uniqueRegions(value),
  })
  favoriteOptionsSync(entity, null, api)
}

export function favoriteOptionsSync(entity, _, api) {
  const favorites = [...getFieldValue(entity, "favorite_regions", [])]
  const regions = api.getEntity("jobList")?.regions ?? []
  api.notify("#favoriteRegionOnboarding:valueSet", favorites)
  api.notify(
    "#favoriteRegionOnboarding:optionsSet",
    favoriteRegionOptions(regions, favorites),
  )
}

export function professionToggle(entity, professionId) {
  fieldToggle(entity, "professions", professionId)
}

export const skip = handleAsync("skip", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not logged in")
    const { error } = await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", user.id)
    if (error) throw error
    return true
  },
  success(entity, _, api) {
    entity.status = "ready"
    api.notify("#authentication:onboardingFinish")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.save")
  },
})

export function saveSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateOnboarding })
  if (!entity.isValid) return
  entity.error = null
  // Copied: the save runs after this draft is revoked.
  api.notify(`#${entity.id}:save`, {
    ...entity.values,
    professions: [...entity.values.professions],
    favorite_regions: [...entity.values.favorite_regions],
  })
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ country, website, phone, professions, favorite_regions }) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not logged in")
    const site = (website ?? "").trim().toLowerCase()
    const { error } = await supabase
      .from("profiles")
      .update({
        country: country.trim(),
        website:
          site === ""
            ? ""
            : /^https?:\/\//i.test(site)
              ? site
              : `https://${site}`,
        phone: (phone ?? "").trim(),
        professions,
        favorite_regions,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", user.id)
    if (error) throw error
    return true
  },
  success(entity, _, api) {
    entity.status = "ready"
    api.notify("#authentication:onboardingFinish")
    api.notify("#profile:load")
    api.notify("#jobList:load")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "errors.save")
  },
})

function validateOnboarding(values) {
  const errors = {}
  if (!(values.country ?? "").trim()) errors.country = "Pick a country"
  return errors
}

function fieldToggle(entity, field, value) {
  const current = getFieldValue(entity, field, [])
  Form.fieldChange(entity, {
    path: field,
    value: current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value],
  })
}
