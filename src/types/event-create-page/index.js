import * as handlers from "./handlers.js"
import { categoryById } from "../events-page/categories.js"
import { renderCreateEvent } from "./template.js"

const { save, ...syncHandlers } = handlers

export const CreateEventPage = {
  ...syncHandlers,
  ...save,
  render(entity, api) {
    const id = entity.id
    return renderCreateEvent({
      entity,
      onField: ({ field, value }) =>
        api.notify(`#${id}:setField`, { field, value }),
      onDetailField: ({ field, value }) =>
        api.notify(`#${id}:setDetailField`, { field, value }),
      onCategory: (category) => api.notify(`#${id}:selectCategory`, category),
      onSave: () => {
        const title_from = categoryById(entity.category).title_from
        const title = title_from.input
          ? entity.title
          : title_from.fields
              .map((field) => (entity.details[field] ?? "").trim())
              .join(title_from.join)
        return api.notify(`#${id}:save`, {
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
      onNavigate: (value) => {
        if (value === "events") {
          api.notify(`#${id}:close`)
        }
        if (value === "profile") {
          api.notify(`#${id}:close`)
          api.notify("#profile:open")
        }
      },
    })
  },
}
