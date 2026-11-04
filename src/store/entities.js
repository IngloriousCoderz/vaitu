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
    selectedValue: null,
    isMulti: false,
    isOpen: false,
    isSearchable: true,
    isClearable: false,
    isDisabled: false,
    isLoading: false,
    searchTerm: "",
    focusedIndex: -1,
    placeholder: "combobox.select",
    noOptionsMessage: "combobox.noOptions",
    loadingMessage: "combobox.loading",
    isFullWidth: true,
    size: "md",
    options: languages,
    changeJob: "#i18n:localeChange",
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
    type: "CountrySelect",
    label: "jobs.orderBy",
    selectedValue: DEFAULT_SORT,
    isMulti: false,
    isOpen: false,
    isSearchable: false,
    isClearable: false,
    isDisabled: false,
    isLoading: false,
    searchTerm: "",
    focusedIndex: -1,
    placeholder: "combobox.select",
    noOptionsMessage: "combobox.noOptions",
    loadingMessage: "combobox.loading",
    isFullWidth: false,
    size: "sm",
    options: sorts,
    changeJob: "#jobList:sortSelect",
  },
}

function countrySelect(targetId, targetJob, overrides = {}) {
  return {
    type: "CountrySelect",
    ...overrides,
    label: overrides.label ?? "",
    selectedValue: null,
    isMulti: false,
    isOpen: false,
    isSearchable: true,
    isClearable: false,
    isDisabled: false,
    isLoading: false,
    searchTerm: "",
    focusedIndex: -1,
    placeholder: "combobox.select",
    noOptionsMessage: "combobox.noCountries",
    loadingMessage: "combobox.loading",
    isFullWidth: true,
    size: "md",
    options: countryOptions,
    changeJob: `#${targetId}:${targetJob}`,
    changePayload: { field: "country" },
  }
}

function regionSelect(targetId, targetJob, overrides = {}) {
  return {
    type: "CountrySelect",
    ...overrides,
    label: overrides.label ?? "",
    selectedValue: null,
    isMulti: false,
    isOpen: false,
    isSearchable: true,
    isClearable: true,
    isDisabled: false,
    isLoading: false,
    searchTerm: "",
    focusedIndex: -1,
    placeholder: "combobox.select",
    noOptionsMessage: "combobox.noRegions",
    loadingMessage: "combobox.loading",
    isFullWidth: true,
    size: "md",
    options: regionOptions,
    changeJob: `#${targetId}:${targetJob}`,
    changePayload: { field: "region" },
  }
}

function jobTypeSelect(targetId, targetJob) {
  return {
    type: "CountrySelect",
    selectedValue: null,
    isMulti: false,
    isOpen: false,
    isSearchable: true,
    isClearable: false,
    isDisabled: false,
    isLoading: false,
    searchTerm: "",
    focusedIndex: -1,
    placeholder: "combobox.select",
    noOptionsMessage: "combobox.noOptions",
    loadingMessage: "combobox.loading",
    isFullWidth: true,
    size: "md",
    options: availableJobTypes,
    changeJob: `#${targetId}:${targetJob}`,
    changePayload: { field: "job_type" },
  }
}

function jobTypesSelect(targetId, label = "") {
  return {
    ...jobTypeSelect(targetId, "jobTypesSet"),
    label,
    selectedValue: [],
    isMulti: true,
    placeholder: "combobox.allJobTypes",
  }
}

function detailSelect(field, options, label) {
  return {
    type: "CountrySelect",
    label,
    selectedValue: null,
    isMulti: false,
    isOpen: false,
    isSearchable: false,
    isClearable: false,
    isDisabled: false,
    isLoading: false,
    searchTerm: "",
    focusedIndex: -1,
    placeholder: "combobox.select",
    noOptionsMessage: "combobox.noOptions",
    loadingMessage: "combobox.loading",
    isFullWidth: true,
    size: "md",
    options,
    changeJob: "#jobCreate:detailFieldSet",
    changePayload: { field },
  }
}

function favoriteRegionsSelect(targetId, targetJob, label) {
  return {
    ...regionSelect(targetId, targetJob, { label }),
    options: favoriteRegionOptions([]),
    selectedValue: [],
    isMulti: true,
    isCreatable: true,
    isClearable: false,
    searchPlaceholder: "combobox.searchOrAddRegion",
  }
}
