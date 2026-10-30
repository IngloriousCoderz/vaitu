import {
  filterOptions,
  formatOption,
  getOptionValue,
} from "@inglorious/ui/combobox"

import { FIRST_INDEX } from "../../constants/index.js"

const NO_FOCUSED_INDEX = -1
const NOT_FOUND = -1
const REMOVE_ONE = 1
const NEXT_STEP = 1
const PREV_STEP = -1

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

  entity.error ??= null
  entity.options ??= []
  entity.options = entity.options.map(formatOption)

  entity.isLoading ??= false
  entity.isDisabled ??= false
  entity.isSearchable ??= false
  entity.isClearable ??= false

  entity.placeholder ??= "combobox.select"
  entity.searchPlaceholder ??= "combobox.search"
  entity.noOptionsMessage ??= "combobox.noOptions"
  entity.loadingMessage ??= "combobox.loading"
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
  if (normalizedOption.isDisabled) return
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

  if (entity.targetId && entity.targetEvent && entity.targetField) {
    api.notify(`#${entity.targetId}:${entity.targetEvent}`, {
      field: entity.targetField,
      value: "",
    })
  }
}

/**
 * @param {any} entity
 * @param {string} searchTerm
 */
export function searchChange(entity, searchTerm) {
  entity.searchTerm = searchTerm
  const filtered = filterOptions(entity.options, entity.searchTerm)
  entity.focusedIndex = enabledIndex(filtered, FIRST_INDEX, NEXT_STEP)
}

export function focusNext(entity) {
  const filtered = filterOptions(entity.options, entity.searchTerm)
  const next = enabledIndex(
    filtered,
    entity.focusedIndex + NEXT_STEP,
    NEXT_STEP,
  )
  if (next !== NO_FOCUSED_INDEX) entity.focusedIndex = next
}

export function focusPrev(entity) {
  const filtered = filterOptions(entity.options, entity.searchTerm)
  if (entity.focusedIndex <= FIRST_INDEX) {
    entity.focusedIndex = NO_FOCUSED_INDEX
    return
  }
  entity.focusedIndex = enabledIndex(
    filtered,
    entity.focusedIndex - NEXT_STEP,
    PREV_STEP,
  )
}

export function focusFirst(entity) {
  const filtered = filterOptions(entity.options, entity.searchTerm)
  entity.focusedIndex = enabledIndex(filtered, FIRST_INDEX, NEXT_STEP)
}

export function focusLast(entity) {
  const filtered = filterOptions(entity.options, entity.searchTerm)
  entity.focusedIndex = enabledIndex(
    filtered,
    filtered.length - NEXT_STEP,
    PREV_STEP,
  )
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
/**
 * Carry a validation message. The combobox is its own entity, rendered by id, so
 * the form that owns it has to hand the message over — the same way `sync` and
 * `optionsSet` already carry the value and the option list.
 * @param {any} entity
 * @param {string|null} error
 */
export function errorSet(entity, error) {
  entity.error = error ?? null
}

export function sync(entity, value) {
  entity.selectedValue = value || null
  entity.searchTerm = ""
  entity.focusedIndex = NO_FOCUSED_INDEX
}

/** Replace the option list. Used when favorite regions follow the events. */
export function optionsSet(entity, options) {
  entity.options = (options ?? []).map(formatOption)
  entity.searchTerm = ""
  entity.focusedIndex = NO_FOCUSED_INDEX
}

function isHeading(option) {
  return formatOption(option).isDisabled
}

function enabledIndex(options, start, step) {
  for (
    let index = start;
    index >= FIRST_INDEX && index < options.length;
    index += step
  ) {
    if (!isHeading(options[index])) return index
  }
  return NO_FOCUSED_INDEX
}

function doOpen(entity) {
  if (entity.isDisabled) return
  entity.isOpen = true

  const filtered = filterOptions(entity.options, entity.searchTerm)
  entity.focusedIndex = enabledIndex(filtered, FIRST_INDEX, NEXT_STEP)
}

function doClose(entity) {
  entity.isOpen = false
  entity.focusedIndex = NO_FOCUSED_INDEX
}
