import * as handlers from "./handlers.js"
import { renderOnboarding } from "./template.js"

const { save, ...syncHandlers } = handlers

export const OnboardingPage = {
  ...syncHandlers,
  ...save,
  render(entity, api) {
    const id = entity.id
    return renderOnboarding({
      entity,
      onField: ({ field, value }) =>
        api.notify(`#${id}:fieldSet`, { field, value }),
      onSave: () =>
        api.notify(`#${id}:save`, {
          country: entity.country,
          region: entity.region,
          website: entity.website,
          instagram: entity.instagram,
        }),
      onSkip: () => api.notify(`#${id}:skip`),
      renderCountry: () => api.render("country-onboarding"),
    })
  },
}
