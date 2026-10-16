import { countries } from "../data/countries.js"
import { festivalGenres, weddingStyles } from "../data/event-taxonomy.js"
import { italianRegions } from "../data/regions/index.js"

const countryOptions = countries.map((country) => ({
  value: country,
  label: country,
}))

const regionOptions = italianRegions.map((region) => ({
  value: region,
  label: region,
}))

// `label` and `isRequired` are rendered by the combobox itself now, so a form
// does not have to wrap it in a hand-written label to show one.
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
    placeholder: "Select…",
    noOptionsMessage: "No countries found",
    loadingMessage: "Loading…",
    isFullWidth: true,
    size: "md",
    options: countryOptions,
    targetId,
    targetEvent,
    targetField: "country",
  }
}

// Same combobox as the country field. The form shows it only for Italy.
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
    placeholder: "Select…",
    noOptionsMessage: "No regions found",
    loadingMessage: "Loading…",
    isFullWidth: true,
    size: "md",
    options: regionOptions,
    targetId,
    targetEvent,
    targetField: "region",
  }
}

// Same combobox as the country field. Style and genre are short lists, so the
// panel has no search box; the dropdown still sits on the control.
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
    placeholder: "Select…",
    noOptionsMessage: "No options",
    loadingMessage: "Loading…",
    isFullWidth: true,
    size: "md",
    options,
    targetId: "eventCreate",
    targetEvent: "detailFieldSet",
    targetField,
  }
}

// Same combobox as the country field. Picking a region adds a favorite.
function favoriteRegionSelect(targetId, targetEvent, overrides = {}) {
  return {
    ...regionSelect(targetId, targetEvent, overrides),
    isClearable: false,
    placeholder: "Select…",
    targetField: "favorite",
  }
}

export const entities = {
  "country-onboarding": countrySelect("onboarding", "fieldSet"),
  "country-profile": countrySelect("profile", "profileFieldSet", {
    label: "Country",
  }),
  "country-create": countrySelect("eventCreate", "fieldSet", {
    label: "Country",
    isRequired: true,
  }),
  "region-onboarding": regionSelect("onboarding", "fieldSet"),
  "region-profile": regionSelect("profile", "profileFieldSet", {
    label: "Region",
  }),
  "region-create": regionSelect("eventCreate", "fieldSet", {
    label: "Region",
    isRequired: true,
  }),
  "style-create": detailSelect("style", weddingStyles, "Style"),
  "genre-create": detailSelect("genre", festivalGenres, "Genre"),
  "favorite-region-list": favoriteRegionSelect(
    "eventList",
    "favoriteChoiceSelect",
  ),
  "favorite-region-profile": favoriteRegionSelect(
    "profile",
    "favoriteChoiceSelect",
    { label: "Favorite regions (optional)" },
  ),
}
