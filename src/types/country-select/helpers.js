/**
 * Get the value of an option.
 * @param {any} option
 * @returns {string|number}
 */
export function getOptionValue(option) {
  if (typeof option === "object" && option !== null && "value" in option) {
    return option.value
  }
  return option
}

/**
 * Get the label of an option.
 * @param {any} option
 * @returns {string}
 */
export function getOptionLabel(option) {
  if (typeof option === "object" && option !== null && "label" in option) {
    return String(option.label)
  }
  if (typeof option === "object" && option !== null && "value" in option) {
    return String(option.value)
  }
  return String(option)
}

/**
 * Filter options based on search term.
 * @param {any[]} options
 * @param {string} searchTerm
 * @returns {any[]}
 */
export function filterOptions(options, searchTerm) {
  if (!searchTerm || searchTerm.trim() === "") {
    return options
  }
  const searchLower = String(searchTerm).toLowerCase().trim()
  return options.filter((option) => {
    const label = getOptionLabel(option)
    return label.toLowerCase().includes(searchLower)
  })
}

/**
 * Normalize option to object shape used in rendering/handlers.
 * @param {any} option
 * @returns {{ value: string|number, label: string, isDisabled?: boolean }}
 */
export function formatOption(option) {
  if (typeof option === "string" || typeof option === "number") {
    return { value: option, label: String(option) }
  }
  if (typeof option === "object" && option !== null) {
    const value = "value" in option ? option.value : option
    const label = "label" in option ? option.label : option.value
    return { value, label: String(label), isDisabled: !!option.isDisabled }
  }
  return { value: option, label: String(option) }
}

/**
 * Check whether an option is selected.
 * @param {any} option
 * @param {string|number|(string|number)[]|null} selectedValue
 * @param {boolean} isMulti
 * @returns {boolean}
 */
export function isOptionSelected(option, selectedValue, isMulti) {
  const optionValue = getOptionValue(option)
  if (isMulti && Array.isArray(selectedValue)) {
    return selectedValue.some((value) => value === optionValue)
  }
  return selectedValue === optionValue
}