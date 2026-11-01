import { handleAsync } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { interestsFor, jobTypesFor } from "../../data/event-taxonomy.js"
import { regionAfterCountryChange } from "../../data/regions/resolve.js"

export function fieldSet(entity, { field, value }, api) {
  if (field === "country") {
    const previous = getFieldValue(entity, "country", "")
    const region = getFieldValue(entity, "region", "")
    Form.fieldChange(entity, { path: "country", value })
    Form.fieldChange(entity, {
      path: "region",
      value: regionAfterCountryChange(previous, value, region),
    })
    api?.notify("#regionOnboarding:sync", getFieldValue(entity, "region", ""))
  } else {
    Form.fieldChange(entity, { path: field, value })
  }
  entity.error = null
}

export function jobTypesSet(entity, { value }) {
  Form.fieldChange(entity, { path: "interested_job_types", value })
}

export function professionToggle(entity, professionId, api) {
  const current = getFieldValue(entity, "professions", [])
  const professions = current.includes(professionId)
    ? current.filter((id) => id !== professionId)
    : [...current, professionId]
  const interests = interestsFor(
    getFieldValue(entity, "interested_job_types", []),
    professions,
  )
  Form.fieldChange(entity, { path: "professions", value: professions })
  Form.fieldChange(entity, { path: "interested_job_types", value: interests })
  api.notify("#jobTypesOnboarding:optionsSet", jobTypesFor(professions))
  api.notify("#jobTypesOnboarding:sync", interests)
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
    entity.error = err.message ?? "Failed to save"
  },
})

export function saveSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateOnboarding })
  if (!entity.isValid) return
  entity.error = null
  // Copied: the save runs after this draft is revoked.
  api.notify(`#${entity.id}:save`, {
    ...entity.values,
    interested_job_types: [...entity.values.interested_job_types],
    professions: [...entity.values.professions],
  })
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({
    country,
    region,
    website,
    phone,
    interested_job_types,
    professions,
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not logged in")
    const site = (website ?? "").trim().toLowerCase()
    const { error } = await supabase
      .from("profiles")
      .update({
        country: country.trim(),
        region: region.trim(),
        website:
          site === ""
            ? ""
            : /^https?:\/\//i.test(site)
              ? site
              : `https://${site}`,
        phone: (phone ?? "").trim(),
        interested_job_types,
        professions,
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
    api.notify("#eventList:load")
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to save"
  },
})

function validateOnboarding(values) {
  const errors = {}
  if (!(values.country ?? "").trim()) errors.country = "Pick a country"
  return errors
}
