import { FIRST_INDEX } from "../../constants/index.js"
import { festivalGenres, weddingStyles } from "../../data/event-taxonomy.js"
import { t } from "../../i18n/index.js"

export const categories = [
  {
    id: "wedding",
    detailSelect: "styleCreate",
    filters: [
      {
        id: "style",
        get title() {
          return t("filters.weddingStyle")
        },
        options: weddingStyles,
      },
    ],
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
        isRequired: true,
        section: "identity",
      },
      {
        field: "spouse_first_name_2",
        get label() {
          return t("fields.spouse2")
        },
        type: "text",
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
    detailSelect: "genreCreate",
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
  propertyCategory("apartment"),
  propertyCategory("house"),
  propertyCategory("office"),
]

function propertyCategory(id) {
  return {
    id,
    filters: [],
    title_from: { input: true },
    get titleLabel() {
      return t("fields.jobTitle")
    },
    get titlePlaceholder() {
      return t("create.jobTitleExample")
    },
    // Events are public, and this is someone's home.
    get locationPlaceholder() {
      return t("create.propertyLocationExample")
    },
    createFields: [],
  }
}

export function categoryById(id) {
  return categories.find((c) => c.id === id) ?? categories[FIRST_INDEX]
}

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

export function categoryOfDetail(value) {
  return (
    categories.find((category) =>
      category.filters.some((dimension) =>
        dimension.options.some((option) => option.value === value),
      ),
    )?.id ?? null
  )
}
