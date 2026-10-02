import { categoryById } from "../events-page/categories.js"
import * as handlers from "./handlers.js"
import { renderCreateEvent } from "./template.js"

const { save, editLoad, ...syncHandlers } = handlers

export const CreateEventPage = {
  ...syncHandlers,
  ...save,
  ...editLoad,
  render(entity, api) {
    const id = entity.id
    return renderCreateEvent({
      entity,
      onField: ({ field, value }) =>
        api.notify(`#${id}:fieldSet`, { field, value }),
      onDetailField: ({ field, value }) =>
        api.notify(`#${id}:detailFieldSet`, { field, value }),
      onCategory: (category) => api.notify(`#${id}:categorySelect`, category),
      onBack: () => api.notify(`#${id}:close`),
      onSave: () => {
        const title_from = categoryById(entity.category).title_from
        const title = title_from.input
          ? entity.title
          : title_from.fields
              .map((field) => (entity.details[field] ?? "").trim())
              .join(title_from.join)
        return api.notify(`#${id}:save`, {
          editing_event_id: entity.editing_event_id,
          category: entity.category,
          title,
          location: entity.location,
          country: entity.country,
          region: entity.region,
          event_date: entity.event_date,
          application_deadline: entity.application_deadline,
          max_applicants: entity.max_applicants,
          details: entity.details,
        })
      },
      renderCountry: () => api.render("country-create"),
    })
  },
}
