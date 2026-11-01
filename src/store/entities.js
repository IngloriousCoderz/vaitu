import { countries } from "../data/countries.js"
import { festivalGenres, weddingStyles } from "../data/event-taxonomy.js"
import { italianRegions } from "../data/regions/index.js"
import { languages } from "../i18n/index.js"
import { DEFAULT_SORT, sorts } from "../views/event-list/helpers.js"

const countryOptions = countries.map((country) => ({
  value: country,
  label: country,
}))

const regionOptions = italianRegions.map((region) => ({
  value: region,
  label: region,
}))

export const entities = {
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
    targetId: "i18n",
    targetEvent: "localeChange",
    targetField: "locale",
  },
  countryOnboarding: countrySelect("onboarding", "fieldSet"),
  countryProfile: countrySelect("profile", "fieldSet", {
    label: "fields.country",
  }),
  countryCreate: countrySelect("eventCreate", "fieldSet", {
    label: "fields.country",
    isRequired: true,
  }),
  regionOnboarding: regionSelect("onboarding", "fieldSet"),
  regionProfile: regionSelect("profile", "fieldSet", {
    label: "fields.region",
  }),
  regionCreate: regionSelect("eventCreate", "fieldSet", {
    label: "fields.region",
    isRequired: true,
  }),
  styleCreate: detailSelect("style", weddingStyles, "fields.style"),
  genreCreate: detailSelect("genre", festivalGenres, "fields.genre"),
  favoriteRegionPreferences: favoriteRegionSelect(
    "preferences",
    "favoriteChoiceSelect",
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
    targetId: "eventList",
    targetEvent: "sortSelect",
    targetField: "sort",
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
    targetId,
    targetEvent,
    targetField: "country",
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
    targetId,
    targetEvent,
    targetField: "region",
  }
}

function detailSelect(targetField, options, label) {
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
    targetId: "eventCreate",
    targetEvent: "detailFieldSet",
    targetField,
  }
}

function favoriteRegionSelect(targetId, targetEvent, overrides = {}) {
  return {
    ...regionSelect(targetId, targetEvent, overrides),
    isClearable: false,
    placeholder: "combobox.select",
    targetField: "favorite",
  }
}
