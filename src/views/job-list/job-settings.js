import { FIRST_INDEX } from "../../constants/index.js"
import {
  detailsBySetting,
  musicGenres,
  weddingMoments,
  weddingStyles,
} from "../../data/job-taxonomy.js"
import { t } from "../../i18n/index.js"

const styleDetail = {
  id: "styles",
  get title() {
    return t("filters.weddingStyle")
  },
  get label() {
    return t("fields.style")
  },
  options: weddingStyles,
}

const momentDetail = {
  id: "moments",
  get title() {
    return t("filters.weddingMoment")
  },
  get label() {
    return t("fields.moments")
  },
  options: weddingMoments,
}

const genreDetail = {
  id: "genres",
  get title() {
    return t("filters.musicGenre")
  },
  get label() {
    return t("fields.genre")
  },
  options: musicGenres,
}

const detailsById = {
  styles: styleDetail,
  moments: momentDetail,
  genres: genreDetail,
}

export const settings = [
  {
    id: "wedding",
    details: detailsOf("wedding"),
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
    details: detailsOf(id),
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
    ],
  }
}

function propertySetting(id) {
  return {
    id,
    details: detailsOf(id),
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
  return sectionsOf(
    new Set(
      scoped.flatMap((setting) => setting.details.map(({ detail }) => detail)),
    ),
  )
}

export function filterSectionsFor(jobTypes) {
  if (!jobTypes.length) return filterSections([])
  return sectionsOf(new Set(jobTypes.flatMap(detailsFor)))
}

/** The pickers a job of this setting and profession has, like styles or genres. */
export function detailsFor({ setting, profession }) {
  return settingById(setting)
    .details.filter(
      ({ professions }) => !professions || professions.includes(profession),
    )
    .map(({ detail }) => detail)
}

export function hasDetail(jobType) {
  return Boolean(detailsFor(jobType).length)
}

export function detailAppliesTo(value, jobType) {
  return detailsFor(jobType).some((detail) =>
    detail.options.some((option) => option.value === value),
  )
}

function detailsOf(settingId) {
  return Object.entries(detailsBySetting[settingId] ?? {}).map(
    ([field, professions]) => ({ detail: detailsById[field], professions }),
  )
}

function sectionsOf(details) {
  return [...details].map((detail) => ({
    id: detail.id,
    settings: settings
      .filter((setting) =>
        setting.details.some((entry) => entry.detail === detail),
      )
      .map((setting) => setting.id),
    title: detail.title,
    options: detail.options.map((option) => ({
      id: option.value,
      label: option.label,
    })),
  }))
}
