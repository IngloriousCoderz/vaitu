import { FIRST_INDEX } from "../../constants/index.js"
import { festivalGenres, weddingStyles } from "../../data/event-taxonomy.js"
import { t } from "../../i18n/index.js"

// Per-category registry. Each category owns its label, filter dimensions and
// creation fields — a future category adds an entry without touching others.
export const categories = [
  {
    id: "wedding",
    get label() {
      return t("category.wedding")
    },
    filters: [
      {
        id: "style",
        get allLabel() {
          return t("filters.allStyles")
        },
        options: weddingStyles,
      },
    ],
    // Title is derived from the spouses, not typed.
    title_from: {
      fields: ["spouse_first_name_1", "spouse_first_name_2"],
      join: " & ",
    },
    createFields: [
      {
        field: "spouse_first_name_1",
        get label() {
          return t("fields.spouse1")
        },
        type: "text",
        // The form marks this one so the asterisk matches what the validators
        // actually demand. Selects below stay optional.
        isRequired: true,
        section: "identity",
      },
      {
        field: "spouse_first_name_2",
        get label() {
          return t("fields.spouse2")
        },
        type: "text",
        // The form marks this one so the asterisk matches what the validators
        // actually demand. Selects below stay optional.
        isRequired: true,
        section: "identity",
      },
      {
        field: "style",
        get label() {
          return t("fields.style")
        },
        type: "select",
        options: weddingStyles,
        section: "style",
      },
    ],
  },
  {
    id: "festival",
    get label() {
      return t("category.festival")
    },
    filters: [
      {
        id: "genre",
        get allLabel() {
          return t("filters.allGenres")
        },
        options: festivalGenres,
      },
    ],
    title_from: { input: true },
    createFields: [
      {
        field: "headliner",
        get label() {
          return t("fields.headliner")
        },
        type: "text",
        // The form marks this one so the asterisk matches what the validators
        // actually demand. Selects below stay optional.
        isRequired: true,
        section: "identity",
      },
      {
        field: "genre",
        get label() {
          return t("fields.genre")
        },
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
// Option values come from the same source the validators check, so a filter
// chip can never offer a value the form would reject.
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
