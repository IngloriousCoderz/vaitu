import { countries } from "../data/countries.js"

const countryOptions = countries.map((country) => ({
  value: country,
  label: country,
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

export const entities = {
  "country-onboarding": countrySelect("onboarding", "fieldSet"),
  "country-profile": countrySelect("profile", "profileFieldSet"),
  "country-create": countrySelect("eventCreate", "fieldSet"),
}
