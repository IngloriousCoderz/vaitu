import { FIRST_INDEX, LAST_INDEX_OFFSET } from "./constants.js"

export function capitalize(text) {
  return (
    text.at(FIRST_INDEX).toUpperCase() +
    text.slice(FIRST_INDEX + LAST_INDEX_OFFSET)
  )
}
