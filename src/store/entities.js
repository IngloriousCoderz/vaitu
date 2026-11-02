import { countries } from "../data/countries.js"
import { jobTypes, musicGenres, weddingStyles } from "../data/event-taxonomy.js"
import { italianRegions } from "../data/regions/index.js"
import { favoriteRegionOptions, regionOption } from "../data/regions/resolve.js"
import { languages } from "../i18n/index.js"
import { DEFAULT_SORT, sorts } from "../views/event-list/helpers.js"

const countryOptions = countries.map((country) => ({
  value: country,
  label: country,
}))

const regionOptions = italianRegions.map(regionOption)

export const entities = {
  safety: { type: "Safety" },
  analytics: { type: "AnalyticsConsent" },
  i18n: { type: "I18n" },
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
    changeEvent: "#i18n:localeChange",
  },
  countryOnboarding: countrySelect("onboarding", "fieldSet"),
  countryProfile: countrySelect("profile", "fieldSet", {
    label: "fields.country",
  }),
  countryCreate: countrySelect("eventCreate", "fieldSet", {
    label: "fields.country",
    isRequired: true,
  }),
  regionCreate: regionSelect("eventCreate", "fieldSet", {
    label: "fields.region",
    isRequired: true,
  }),
  jobTypeCreate: {
    ...jobTypeSelect("eventCreate", "jobTypeSelect"),
    label: "fields.jobType",
    isRequired: true,
  },
  jobTypesOnboarding: jobTypesSelect("onboarding", "fields.jobTypes"),
  jobTypesPreferences: jobTypesSelect("preferences", "fields.jobTypes"),
  jobTypesFilter: jobTypesSelect("eventList"),
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
  eventsOrderBy: {
    type: "CountrySelect",
    label: "events.orderBy",
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
    changeEvent: "#eventList:sortSelect",
  },
}

function countrySelect(targetId, targetEvent, overrides = {}) {
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
    changeEvent: `#${targetId}:${targetEvent}`,
    changePayload: { field: "country" },
  }
}

function regionSelect(targetId, targetEvent, overrides = {}) {
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
    changeEvent: `#${targetId}:${targetEvent}`,
    changePayload: { field: "region" },
  }
}

function jobTypeSelect(targetId, targetEvent) {
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
    options: jobTypes,
    changeEvent: `#${targetId}:${targetEvent}`,
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
    changeEvent: "#eventCreate:detailFieldSet",
    changePayload: { field },
  }
}

function favoriteRegionsSelect(targetId, targetEvent, label) {
  return {
    ...regionSelect(targetId, targetEvent, { label }),
    options: favoriteRegionOptions([]),
    selectedValue: [],
    isMulti: true,
    isCreatable: true,
    isClearable: false,
    searchPlaceholder: "combobox.searchOrAddRegion",
  }
}
