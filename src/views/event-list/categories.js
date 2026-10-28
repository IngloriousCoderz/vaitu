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
        get title() {
          return t("filters.weddingStyle")
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
        get title() {
          return t("filters.festivalGenre")
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

// One section of chips per filter dimension of these categories, or of every
// category when none is picked. Option values come from the same source the
// validators check, so a filter chip can never offer a value the form would
// reject.
export function filterSections(categoryIds) {
  const scoped = categoryIds.length
    ? categories.filter((category) => categoryIds.includes(category.id))
    : categories
  return scoped.flatMap((category) =>
    category.filters.map((dimension) => ({
      id: dimension.id,
      category: category.id,
      title: dimension.title,
      options: dimension.options.map((option) => ({
        id: option.value,
        label: option.label,
      })),
    })),
  )
}

// The category a style or genre belongs to. Values are unique across
// categories, so the value alone says which.
export function categoryOfDetail(value) {
  return (
    categories.find((category) =>
      category.filters.some((dimension) =>
        dimension.options.some((option) => option.value === value),
      ),
    )?.id ?? null
  )
}
