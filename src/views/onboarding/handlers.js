import { handleAsync } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
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
    api?.notify("#region-onboarding:sync", getFieldValue(entity, "region", ""))
  } else {
    Form.fieldChange(entity, { path: field, value })
  }
  entity.error = null
}

export function interestToggle(entity, categoryId) {
  const current = getFieldValue(entity, "interested_categories", [])
  Form.fieldChange(entity, {
    path: "interested_categories",
    value: current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId],
  })
}

// Skipping counts as done: it is offered once, not on every sign-in.
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
  // The save runs after this handler's draft is revoked: the picked
  // categories go as a copy, the rest are strings.
  api.notify(`#${entity.id}:save`, {
    ...entity.values,
    interested_categories: [...entity.values.interested_categories],
  })
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ country, region, website, instagram, interested_categories }) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not logged in")
    const site = (website ?? "").trim().toLowerCase()
    const handle = (instagram ?? "").trim().toLowerCase().replace(/^@+/, "")
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
        instagram_handle: handle === "" ? "" : `@${handle}`,
        interested_categories,
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
    // The categories picked here are what the feed now shows by default.
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
