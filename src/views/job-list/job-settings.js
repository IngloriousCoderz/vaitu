import { FIRST_INDEX } from "../../constants/index.js"
import {
  musicGenres,
  settingSpecs,
  weddingMoments,
  weddingStyles,
} from "../../data/job-taxonomy.js"
import { localized, t } from "../../i18n/index.js"

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

const NAMES_SEPARATOR = " & "

export const settings = Object.entries(settingSpecs).map(([id, spec]) => ({
  id,
  details: Object.entries(spec.details).map(([field, professions]) => ({
    detail: detailsById[field],
    professions,
  })),
  title_from: spec.isTitled
    ? { input: true }
    : { fields: spec.textFields, join: NAMES_SEPARATOR },
  createFields: spec.textFields.map(textField),
  get titleLabel() {
    return spec.isHome ? t("fields.jobTitle") : null
  },
  get titlePlaceholder() {
    return spec.isHome ? t("create.jobTitleExample") : null
  },
  // Jobs are public, and this is someone's home.
  get locationPlaceholder() {
    return spec.isHome ? t("create.propertyLocationExample") : null
  },
}))

function textField(field) {
  return {
    field,
    get label() {
      return t(`fields.${field}`)
    },
    type: "text",
    isRequired: true,
    section: "identity",
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
      label: localized(option.labels),
    })),
  }))
}
