import { countries } from "../data/countries.js"
import {
  availableJobTypes,
  musicGenres,
  weddingStyles,
} from "../data/job-taxonomy.js"
import { italianRegions } from "../data/regions/index.js"
import { favoriteRegionOptions, regionOption } from "../data/regions/resolve.js"
import { languages } from "../i18n/index.js"
import { DEFAULT_SORT, sorts } from "../views/job-list/helpers.js"

const countryOptions = countries.map((country) => ({
  value: country,
  label: country,
}))

const regionOptions = italianRegions.map(regionOption)

export const entities = {
  safety: { type: "Safety" },
  analytics: { type: "AnalyticsConsent" },
  i18n: { type: "I18n" },
  network: { type: "NetworkStatus" },
  language: {
    type: "LanguageSelect",
    isSearchable: true,
    isFullWidth: true,
    options: languages,
    changeEvent: "#i18n:localeChange",
  },
  countryOnboarding: countrySelect("onboarding", "fieldSet"),
  countryProfile: countrySelect("profile", "fieldSet", {
    label: "fields.country",
  }),
  countryCreate: countrySelect("jobCreate", "fieldSet", {
    label: "fields.country",
    isRequired: true,
  }),
  regionCreate: regionSelect("jobCreate", "fieldSet", {
    label: "fields.region",
    isRequired: true,
  }),
  jobTypeCreate: {
    ...jobTypeSelect("jobCreate", "jobTypeSelect"),
    label: "fields.jobType",
    isRequired: true,
  },
  jobTypesOnboarding: jobTypesSelect("onboarding", "fields.jobTypes"),
  jobTypesPreferences: jobTypesSelect("preferences", "fields.jobTypes"),
  jobTypesFilter: jobTypesSelect("jobList"),
  styleCreate: detailSelect("style", weddingStyles, "fields.style"),
  genreCreate: detailSelect("genre", musicGenres, "fields.genre"),
  favoriteRegionOnboarding: favoriteRegionsSelect(
    "onboarding",
    "favoriteRegionsSet",
    "preferences.favoriteRegions",
  ),
  favoriteRegionPreferences: favoriteRegionsSelect(
    "preferences",
    "favoriteRegionsSet",
    "preferences.favoriteRegions",
  ),
  jobsOrderBy: {
    type: "TranslatedCombobox",
    label: "jobs.orderBy",
    selectedValue: DEFAULT_SORT,
    options: sorts,
    changeEvent: "#jobList:sortSelect",
  },
}

function countrySelect(targetId, targetEvent, overrides = {}) {
  return {
    type: "TranslatedCombobox",
    isSearchable: true,
    isFullWidth: true,
    noOptionsMessage: "combobox.noCountries",
    options: countryOptions,
    changeEvent: `#${targetId}:${targetEvent}`,
    changePayload: { field: "country" },
    ...overrides,
  }
}

function regionSelect(targetId, targetEvent, overrides = {}) {
  return {
    type: "TranslatedCombobox",
    isSearchable: true,
    isClearable: true,
    isFullWidth: true,
    noOptionsMessage: "combobox.noRegions",
    options: regionOptions,
    changeEvent: `#${targetId}:${targetEvent}`,
    changePayload: { field: "region" },
    ...overrides,
  }
}

function jobTypeSelect(targetId, targetEvent) {
  return {
    type: "TranslatedCombobox",
    isSearchable: true,
    isFullWidth: true,
    options: availableJobTypes,
    changeEvent: `#${targetId}:${targetEvent}`,
    changePayload: { field: "job_type" },
  }
}

function jobTypesSelect(targetId, label = "") {
  return {
    ...jobTypeSelect(targetId, "jobTypesSet"),
    label,
    isMulti: true,
    placeholder: "combobox.allJobTypes",
  }
}

function detailSelect(field, options, label) {
  return {
    type: "TranslatedCombobox",
    label,
    isFullWidth: true,
    options,
    changeEvent: "#jobCreate:detailFieldSet",
    changePayload: { field },
  }
}

function favoriteRegionsSelect(targetId, targetEvent, label) {
  return {
    ...regionSelect(targetId, targetEvent, { label }),
    options: favoriteRegionOptions([]),
    isMulti: true,
    isCreatable: true,
    isClearable: false,
    searchPlaceholder: "combobox.searchOrAddRegion",
  }
}
