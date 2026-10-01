import { FIRST_INDEX } from "../../constants.js"
import { festivalGenres, weddingStyles } from "../../validation/events.js"

// Per-category registry. Each category owns its label, filter dimensions and
// creation fields — a future category adds an entry without touching others.
export const categories = [
  {
    id: "wedding",
    label: "Weddings",
    filters: [{ id: "style", allLabel: "All Styles", options: weddingStyles }],
    // Title is derived from the spouses, not typed.
    title_from: {
      fields: ["spouse_first_name_1", "spouse_first_name_2"],
      join: " & ",
    },
    createFields: [
      {
        field: "spouse_first_name_1",
        label: "Spouse 1 first name",
        type: "text",
        section: "identity",
      },
      {
        field: "spouse_first_name_2",
        label: "Spouse 2 first name",
        type: "text",
        section: "identity",
      },
      {
        field: "style",
        label: "Style",
        type: "select",
        options: weddingStyles,
        section: "style",
      },
    ],
  },
  {
    id: "festival",
    label: "Festivals",
    filters: [{ id: "genre", allLabel: "All Genres", options: festivalGenres }],
    title_from: { input: true },
    createFields: [
      {
        field: "headliner",
        label: "Headliner",
        type: "text",
        section: "identity",
      },
      {
        field: "genre",
        label: "Genre",
        type: "select",
        options: festivalGenres,
        section: "style",
      },
    ],
  },
]

export function categoryById(id) {
  return categories.find((c) => c.id === id) ?? categories[FIRST_INDEX]
}

// Chips for the active category: "show all" + one per valid option.
// Option values come from the same source the Zod schema validates,
// so filter and validation can never diverge.
export function filtersForCategory(categoryId) {
  const [dimension] = categoryById(categoryId).filters
  return [
    { id: "all", label: dimension.allLabel },
    ...dimension.options.map((option) => ({
      id: option.value,
      label: option.label,
    })),
  ]
}
