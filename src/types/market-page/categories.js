import { festivalGenres, weddingStyles } from "../../validation/events.js"

// Per-category registry. Each category owns its label and filter dimensions —
// a future category adds an entry here without touching the others.
export const categories = [
  {
    id: "wedding",
    label: "Weddings",
    filters: [
      { id: "style", allLabel: "All Styles", options: weddingStyles },
    ],
  },
  {
    id: "festival",
    label: "Festivals",
    filters: [{ id: "genre", allLabel: "All Genres", options: festivalGenres }],
  },
]

export function categoryById(id) {
  return categories.find((c) => c.id === id) ?? categories[0]
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
