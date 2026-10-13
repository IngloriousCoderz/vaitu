import { countries } from "../data/countries.js"
import { italianRegions } from "../data/regions/index.js"

const countryOptions = countries.map((country) => ({
  value: country,
  label: country,
}))

const regionOptions = italianRegions.map((region) => ({
  value: region,
  label: region,
}))

function countrySelect(targetId, targetEvent) {
  return {
    type: "CountrySelect",
    label: "",
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
function regionSelect(targetId, targetEvent) {
  return {
    type: "CountrySelect",
    label: "",
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

// Same combobox as the country field. Picking a region adds a favorite.
function favoriteRegionSelect(targetId, targetEvent) {
  return {
    ...regionSelect(targetId, targetEvent),
    isClearable: false,
    placeholder: "Select…",
    targetField: "favorite",
  }
}

export const entities = {
  "country-onboarding": countrySelect("onboarding", "fieldSet"),
  "country-profile": countrySelect("profile", "profileFieldSet"),
  "country-create": countrySelect("eventCreate", "fieldSet"),
  "region-onboarding": regionSelect("onboarding", "fieldSet"),
  "region-profile": regionSelect("profile", "profileFieldSet"),
  "region-create": regionSelect("eventCreate", "fieldSet"),
  "favorite-region-list": favoriteRegionSelect(
    "eventList",
    "favoriteChoiceSelect",
  ),
  "favorite-region-profile": favoriteRegionSelect(
    "profile",
    "favoriteChoiceSelect",
  ),
}
