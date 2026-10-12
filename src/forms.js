import { Form } from "@inglorious/web/form"

export function initForm(entity, initialValues) {
  entity.initialValues = initialValues
  Form.create(entity)
}

function readPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object)
}

function writePath(object, path, value) {
  const keys = path.split(".")
  const last = keys.pop()
  const parent = keys.reduce((current, key) => {
    if (current[key] == null || typeof current[key] !== "object") {
      current[key] = {}
    }
    return current[key]
  }, object)
  parent[last] = value
}

// Zod issues become the error tree Form.validate stores on the entity.
export function errorsFromZod(result) {
  if (result.success) return {}
  const errors = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join(".")
    if (!path || readPath(errors, path)) continue
    writePath(errors, path, issue.message)
  }
  return errors
}

export function firstError(errors) {
  if (errors == null || errors === "") return null
  if (typeof errors === "string") return errors
  if (typeof errors !== "object") return null
  for (const value of Object.values(errors)) {
    const found = firstError(value)
    if (found) return found
  }
  return null
}
