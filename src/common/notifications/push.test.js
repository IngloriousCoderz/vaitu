import { describe, expect, it } from "vitest"

import { messageFor } from "../../../supabase/functions/push-notify/message.ts"
import wording from "../../../supabase/functions/push-notify/wording.json"
import { pathFor } from "./index.js"

const catalogues = import.meta.glob("../../i18n/locales/*.json", {
  eager: true,
})

const TYPES = [
  "application_received",
  "application_selected",
  "application_rejected",
  "application_withdrawn",
  "event_updated",
  "event_closed",
]

function notification(fields = {}) {
  return {
    type: "application_received",
    event_id: "e1",
    application_id: "a1",
    event_title: "Ada & Ben",
    event_status: "open",
    applicant_name: "Carla",
    ...fields,
  }
}

describe("push-notify's copies", () => {
  it("words every notification the way the feed does, in every language", () => {
    const fromCatalogues = Object.fromEntries(
      Object.entries(catalogues).map(([path, catalogue]) => [
        path.match(/(\w+)\.json$/)[1],
        catalogue.default.notifications.types,
      ]),
    )
    expect(wording).toEqual(fromCatalogues)
  })

  it.each(TYPES)("lands a %s push where the feed's row lands", (type) => {
    for (const fields of [
      { type },
      { type, event_status: "closed" },
      { type, event_id: null },
      { type, application_id: null },
    ]) {
      const item = notification(fields)
      expect(messageFor(item, "en").url).toBe(pathFor(item))
    }
  })
})

describe("messageFor", () => {
  it("fills the recipient's language", () => {
    expect(messageFor(notification(), "it")).toEqual({
      title: "Vaitu",
      body: "Carla ha inviato una candidatura per Ada & Ben!",
      url: "/events/e1/applications",
    })
  })

  it("falls back to English for a language it has no lines in", () => {
    expect(messageFor(notification(), "de").body).toBe(
      "Carla applied to Ada & Ben!",
    )
    expect(messageFor(notification(), null).body).toBe(
      "Carla applied to Ada & Ben!",
    )
  })
})
