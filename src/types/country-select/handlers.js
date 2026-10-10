import {
  filterOptions,
  formatOption,
  getOptionValue,
} from "@inglorious/ui/combobox"

import { FIRST_INDEX } from "../../constants.js"

const NO_FOCUSED_INDEX = -1
const NOT_FOUND = -1
const REMOVE_ONE = 1

function doOpen(entity) {
  if (entity.isDisabled) return
  entity.isOpen = true

  const filtered = filterOptions(entity.options, entity.searchTerm)
  entity.focusedIndex = filtered.length ? FIRST_INDEX : NO_FOCUSED_INDEX
}

function doClose(entity) {
  entity.isOpen = false
  entity.focusedIndex = NO_FOCUSED_INDEX
}

/**
 * Initialize entity defaults (mirrors UI package's create handler).
 * @param {any} entity
 */
export function create(entity) {
  entity.size ??= "md"
  entity.isFullWidth ??= false
  entity.label ??= ""

  entity.isOpen ??= false
  entity.searchTerm ??= ""
  entity.focusedIndex ??= NO_FOCUSED_INDEX

  entity.isMulti ??= false
  entity.selectedValue ??= entity.isMulti ? [] : null

  entity.options ??= []
  entity.options = entity.options.map(formatOption)

  entity.isLoading ??= false
  entity.isDisabled ??= false
  entity.isSearchable ??= false
  entity.isClearable ??= false

  entity.placeholder ??= "Select…"
  entity.noOptionsMessage ??= "No options"
  entity.loadingMessage ??= "Loading..."
}

/** @param {any} entity */
export function open(entity) {
  doOpen(entity)
}

/** @param {any} entity */
export function toggle(entity) {
  if (entity.isOpen) doClose(entity)
  else doOpen(entity)
}

/**
 * Select an option.
 * @param {any} entity
 * @param {any} option
 * @param {any} api
 */
export function optionSelect(entity, option, api) {
  if (entity.isDisabled) return

  const normalizedOption = formatOption(option)
  const optionValue = getOptionValue(normalizedOption)

  if (entity.isMulti) {
    const values = Array.isArray(entity.selectedValue)
      ? entity.selectedValue
      : []
    const index = values.indexOf(optionValue)

    if (index === NOT_FOUND) {
      values.push(optionValue)
    } else {
      values.splice(index, REMOVE_ONE)
    }

    entity.selectedValue = values
    return
  }

  entity.selectedValue = optionValue
  doClose(entity)

  // Propagate selection to parent entity
  if (entity.targetId && entity.targetEvent && entity.targetField) {
    api.notify(`#${entity.targetId}:${entity.targetEvent}`, {
      field: entity.targetField,
      value: entity.selectedValue ?? "",
    })
  }
}

/**
 * @param {any} entity
 * @param {any} _payload
 * @param {any} api
 */
export function clear(entity, _payload, api) {
  if (entity.isDisabled) return
  entity.selectedValue = entity.isMulti ? [] : null

  // Propagate clearing to parent entity
  if (entity.targetId && entity.targetEvent && entity.targetField) {
    api.notify(`#${entity.targetId}:${entity.targetEvent}`, {
      field: entity.targetField,
      value: "",
    })
  }
}

/** @param {any} entity */
export function close(entity) {
  doClose(entity)
}

/**
 * @param {any} entity
 * @param {string} searchTerm
 */
export function searchChange(entity, searchTerm) {
  entity.searchTerm = searchTerm
  const filtered = filterOptions(entity.options, entity.searchTerm)
  entity.focusedIndex = filtered.length ? FIRST_INDEX : NO_FOCUSED_INDEX
}

/**
 * @param {any} entity
 * @param {number} index
 */
export function focusSet(entity, index) {
  entity.focusedIndex = Number.isInteger(index) ? index : entity.focusedIndex
}

/**
 * Sync entity with a value (used when opening edit forms).
 * @param {any} entity
 * @param {string|null} value
 */
export function sync(entity, value) {
  entity.selectedValue = value || null
  entity.searchTerm = ""
  entity.focusedIndex = NO_FOCUSED_INDEX
}

/** @param {any} entity */
export function overlaysClose(entity) {
  doClose(entity)
}
