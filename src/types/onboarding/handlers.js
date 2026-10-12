import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"

export function fieldSet(entity, { field, value }) {
  entity[field] = value
  entity.error = null
}

export function skip(entity, _, api) {
  api.notify("#authentication:onboardingFinish")
}

export const save = handleAsync("save", {
  start(entity) {
    entity.status = "saving"
    entity.error = null
  },
  async run({ country, region, website, instagram }) {
    if (!country.trim()) throw new Error("Pick a country")
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
