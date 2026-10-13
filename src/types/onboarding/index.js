import { Form } from "@inglorious/web/form"

import { initForm } from "../../forms.js"
import * as handlers from "./handlers.js"
import { Onboarding as renderers } from "./template.js"

const { save, ...syncHandlers } = handlers

export const Onboarding = {
  ...Form,
  ...syncHandlers,
  ...save,
  ...renderers,

  create(entity) {
    initForm(entity, {
      country: "",
      region: "",
      website: "",
      instagram: "",
    })
    entity.status ??= "idle"
    entity.error ??= null
  },

  render(entity, api) {
    const id = entity.id

    return this.renderOnboarding({
      entity,
      onField: ({ field, value }) =>
        api.notify(`#${id}:fieldSet`, { field, value }),
      onSave: () => api.notify(`#${id}:saveSubmit`),
      onSkip: () => api.notify(`#${id}:skip`),
      renderCountry: () => api.render("country-onboarding"),
      renderRegion: () => api.render("region-onboarding"),
    })
  },
}
