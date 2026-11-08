import { FIRST_INDEX } from "../../constants/index.js"
import { musicGenres, weddingStyles } from "../../data/job-taxonomy.js"
import { t } from "../../i18n/index.js"

const genreFilter = {
  id: "genres",
  get title() {
    return t("filters.musicGenre")
  },
  options: musicGenres,
}

export const settings = [
  {
    id: "wedding",
    detailField: "styles",
    professionsWithoutDetail: ["planner", "makeup_artist"],
    filters: [
      {
        id: "styles",
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
        field: "styles",
        get label() {
          return t("fields.style")
        },
        type: "chips",
        options: weddingStyles,
        section: "style",
      },
    ],
  },
  showSetting("festival"),
  showSetting("concert"),
  propertySetting("apartment"),
  propertySetting("house"),
  propertySetting("office"),
]

function showSetting(id) {
  return {
    id,
    detailField: "genres",
    filters: [genreFilter],
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
        field: "genres",
        get label() {
          return t("fields.genre")
        },
        type: "chips",
        options: musicGenres,
        section: "style",
      },
    ],
  }
}

function propertySetting(id) {
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
    // Jobs are public, and this is someone's home.
    get locationPlaceholder() {
      return t("create.propertyLocationExample")
    },
    createFields: [],
  }
}

export function settingById(id) {
  return settings.find((c) => c.id === id) ?? settings[FIRST_INDEX]
}

export function filterSections(settingIds) {
  const scoped = settingIds.length
    ? settings.filter((setting) => settingIds.includes(setting.id))
    : settings
  const dimensions = new Set(scoped.flatMap((setting) => setting.filters))
  return [...dimensions].map((dimension) => ({
    id: dimension.id,
    settings: settings
      .filter((setting) => setting.filters.includes(dimension))
      .map((setting) => setting.id),
    title: dimension.title,
    options: dimension.options.map((option) => ({
      id: option.value,
      label: option.label,
    })),
  }))
}

export function filterSectionsFor(jobTypes) {
  const detailed = jobTypes.filter(hasDetail)
  if (jobTypes.length && !detailed.length) return []
  return filterSections(detailed.map((jobType) => jobType.setting))
}

export function hasDetail({ setting, profession }) {
  const { detailField, professionsWithoutDetail } = settingById(setting)
  return Boolean(detailField) && !professionsWithoutDetail?.includes(profession)
}

export function detailAppliesTo(value, jobType) {
  return (
    hasDetail(jobType) &&
    settingById(jobType.setting).filters.some((dimension) =>
      dimension.options.some((option) => option.value === value),
    )
  )
}
