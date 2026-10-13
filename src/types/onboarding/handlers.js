import { handleAsync } from "@inglorious/store/async"
import { Form, getFieldValue } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { regionAfterCountryChange } from "../../regions.js"

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

export function skip(entity, _, api) {
  api.notify("#authentication:onboardingFinish")
}

export function saveSubmit(entity, _, api) {
  Form.validate(entity, { validate: validateOnboarding })
  if (!entity.isValid) return
  entity.error = null
  api.notify(`#${entity.id}:save`, { ...entity.values })
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ country, region, website, instagram }) {
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
      })
      .eq("id", user.id)
    if (error) throw error
    return true
  },
  success(entity, _, api) {
    entity.status = "ready"
    api.notify("#authentication:onboardingFinish")
    api.notify("#profile:profileLoad")
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
