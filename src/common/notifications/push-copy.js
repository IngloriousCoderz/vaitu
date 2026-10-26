import { paths } from "../../routes.js"

/* Pure push composition for the store UI and its tests. The push-notify edge
   function keeps a deliberate copy of the same rules (Deno cannot import app
   source); when a destination or param shape changes, both files change
   together — same reason parse-event keeps its prompt beside its handler.
   Nothing here may import app code beyond the route builders (routes.js
   imports nothing itself) — every value a host would provide arrives by
   argument, in the same spirit as check-update.js.

   The rule the copy obeys: the server sends an assembled notification ({title,
   body, url}), so the service worker stays a dumb shower of already-rendered
   text. The feed reads i18n catalogues; the edge owns its own WORDING table. */

// "application_received" -> "applicationReceived": the catalogue keys are
// camelCase like every t() key in the app, while the database column and the
// API rows speak snake_case.
export function notificationTypeKey(type) {
  return type?.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) ?? type
}

// The interpolation i18next would run for `t()`: `{{param}}` placeholders,
// missing params left visibly empty. Kept minimal because a push line is a
// verb and two names, never plurals or nesting.
export function interpolate(template, params = {}) {
  return (
    template?.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? "") ?? ""
  )
}

// Where a tap/notification click lands on this item. Composed for the feed's
// item shape (embedded joins flattened into top-level fields).
export function pathFor(item) {
  if (item.type === "application_received") {
    return item.event_status === "open" && item.event_id
      ? paths.receivedApplications(item.event_id)
      : item.event_id
        ? paths.event(item.event_id)
        : paths.events
  }
  if (
    item.type === "application_selected" ||
    item.type === "application_rejected"
  ) {
    return item.application_id
      ? paths.application(item.application_id)
      : paths.applications
  }
  return item.event_id ? paths.event(item.event_id) : paths.events
}

// Feed's item shape (what fetchMyNotifications returns) -> { name, title } in
// the order each phrase expects. The feed renders these same params through
// t() in template.js; the units assert both paths agree.
export function pushParamsFor(item) {
  const title = item.event_title ?? ""
  if (item.type === "application_received") {
    return { name: item.applicant_name ?? "", title }
  }
  return { title }
}

// The whole message a service worker shows: brand name as the title (a brand
// is not translated), the catalogue line as the body, and the screen the hop
// should land on. `catalogue` is the locale's whole file; when its language
// has no line for the type yet, the body falls back to the English one, which
// is always complete.
export function pushFor(item, catalogue, fallbackCatalogue) {
  const types = catalogue?.notifications?.types ?? {}
  const fallbackTypes = fallbackCatalogue?.notifications?.types ?? {}
  const template =
    types[notificationTypeKey(item.type)] ??
    fallbackTypes[notificationTypeKey(item.type)]
  return {
    title: "Vaitu",
    body: interpolate(template, pushParamsFor(item)),
    url: pathFor(item),
  }
}
