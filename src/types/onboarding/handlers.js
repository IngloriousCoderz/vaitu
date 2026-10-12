import { handleAsync } from "@inglorious/store/async"
import { Form } from "@inglorious/web/form"

import { supabase } from "../../api/client.js"
import { firstError } from "../../forms.js"

export function fieldSet(entity, { field, value }) {
  Form.fieldChange(entity, { path: field, value })
  entity.error = null
}

export function skip(entity, _, api) {
  api.notify("#authentication:onboardingFinish")
}

export function saveSubmit(entity, _, api) {
  api.notify(`#${entity.id}:validate`, {
    validate: (values) => ({
      country: values.country.trim() ? null : "Pick a country",
    }),
  })
  api.notify(`#${entity.id}:saveProceed`)
}

export function saveProceed(entity, _, api) {
  const error = firstError(entity.errors)
  if (error) {
    entity.error = error
    return
  }
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
