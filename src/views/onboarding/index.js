import { Form } from "@inglorious/web/form"

import * as handlers from "./handlers.js"
import { template } from "./template.js"

const { save, skip, ...syncHandlers } = handlers

export const Onboarding = {
  ...Form,
  ...syncHandlers,
  ...save,
  ...skip,
  ...template,

  create(entity) {
    entity.initialValues = {
      country: "",
      website: "",
      phone: "",
      interested_job_types: [],
      professions: [],
      favorite_regions: [],
    }
    Form.create(entity)
    entity.status ??= "idle"
    entity.error ??= null
  },

  render(entity, api) {
    const id = entity.id

    return this.renderOnboarding(
      {
        entity,
        onField: ({ field, value }) =>
          api.notify(`#${id}:fieldSet`, { field, value }),
        onToggleProfession: (professionId) =>
          api.notify(`#${id}:professionToggle`, professionId),
        onSave: () => api.notify(`#${id}:saveSubmit`),
        onSkip: () => api.notify(`#${id}:skip`),
      },
      api,
    )
  },
}
