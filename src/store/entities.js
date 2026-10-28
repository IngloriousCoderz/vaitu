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
  // The active language. `#i18n:localeChange` switches it.
  i18n: { type: "I18n" },
  // The language picker, on the sign-in screen and on the profile. Its value
  // is the active language; picking one notifies `#i18n:localeChange`.
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
  "country-onboarding": countrySelect("onboarding", "fieldSet"),
  "country-profile": countrySelect("profile", "fieldSet", {
    label: "fields.country",
  }),
  "country-create": countrySelect("eventCreate", "fieldSet", {
    label: "fields.country",
    isRequired: true,
  }),
  "region-onboarding": regionSelect("onboarding", "fieldSet"),
  "region-profile": regionSelect("profile", "fieldSet", {
    label: "fields.region",
  }),
  "region-create": regionSelect("eventCreate", "fieldSet", {
    label: "fields.region",
    isRequired: true,
  }),
  "style-create": detailSelect("style", weddingStyles, "fields.style"),
  "genre-create": detailSelect("genre", festivalGenres, "fields.genre"),
  "favorite-region-preferences": favoriteRegionSelect(
    "preferences",
    "favoriteChoiceSelect",
  ),
  // Same combobox as Country / style: short list, no search.
  "events-order-by": {
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

// `label` and `isRequired` are rendered by the combobox itself now, so a form
// does not have to wrap it in a hand-written label to show one. Labels,
// placeholders and messages are translation keys: state keeps the key and
// CountrySelect translates it when it renders, so they follow the language.
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

// Same combobox as the country field. Picking a region adds a favorite.
function favoriteRegionSelect(targetId, targetEvent, overrides = {}) {
  return {
    ...regionSelect(targetId, targetEvent, overrides),
    isClearable: false,
    placeholder: "combobox.select",
    targetField: "favorite",
  }
}
