import { describe, expect, it } from "vitest"

import {
  byRecipient,
  compose,
  isDropped,
  isDue,
  latestDigestAt,
} from "../../../supabase/functions/send-emails/compose.ts"
import wording from "../../../supabase/functions/send-emails/wording.json"
import {
  isMuted,
  notificationGroups,
  withMuted,
} from "../../data/notification-types.js"

const catalogues = import.meta.glob("../../i18n/locales/*.json", {
  eager: true,
})

const NOW = new Date("2026-11-10T12:00:00Z")

function row(fields = {}) {
  return {
    id: "n1",
    user_id: "u1",
    type: "application_received",
    created_at: "2026-11-10T11:58:00Z",
    is_read: false,
    is_active: true,
    muted_email_types: [],
    locale: "en",
    job_id: "e1",
    application_id: "a1",
    job_title: "Ada & Ben",
    job_status: "open",
    applicant_name: "Carla",
    poster_name: "Luca",
    ...fields,
  }
}

const RECIPIENT = { email: "carla@example.com", token: "tok" }
const URLS = {
  appUrl: "https://app.test",
  supabaseUrl: "https://db.test",
}

describe("send-emails' copies", () => {
  it("words the emails the way the catalogues do, in every language", () => {
    const fromCatalogues = Object.fromEntries(
      Object.entries(catalogues).map(([path, catalogue]) => [
        path.match(/(\w+)\.json$/)[1],
        catalogue.default.notifications.email,
      ]),
    )
    expect(wording).toEqual(fromCatalogues)
  })

  it("offers a preference for every notification, in every language", () => {
    const types = notificationGroups.flatMap((group) => group.types)
    expect(types).toHaveLength(new Set(types).size)
    for (const catalogue of Object.values(catalogues)) {
      const labels = catalogue.default.preferences.notifications.types
      expect(Object.keys(labels).sort()).toEqual([...types].sort())
    }
  })
})

describe("which notifications get an email", () => {
  it("drops what was read, muted, or is too old", () => {
    expect(isDropped(row(), NOW)).toBe(false)
    expect(isDropped(row({ is_read: true }), NOW)).toBe(true)
    expect(isDropped(row({ is_active: false }), NOW)).toBe(true)
    expect(
      isDropped(row({ muted_email_types: ["application_received"] }), NOW),
    ).toBe(true)
    expect(isDropped(row({ muted_email_types: ["all"] }), NOW)).toBe(true)
    expect(isDropped(row({ muted_email_types: ["new_job"] }), NOW)).toBe(false)
    expect(isDropped(row({ created_at: "2026-11-06T12:00:00Z" }), NOW)).toBe(
      true,
    )
  })

  it("holds new jobs for the morning digest, and nothing else", () => {
    expect(latestDigestAt(NOW).toISOString()).toBe("2026-11-10T07:00:00.000Z")
    expect(latestDigestAt(new Date("2026-11-10T06:00:00Z")).toISOString()).toBe(
      "2026-11-09T07:00:00.000Z",
    )

    expect(isDue(row(), NOW)).toBe(true)
    expect(isDue(row({ type: "new_job" }), NOW)).toBe(false)
    expect(
      isDue(row({ type: "new_job", created_at: "2026-11-10T06:59:00Z" }), NOW),
    ).toBe(true)
  })

  it("puts people waiting on more than a digest first", () => {
    const groups = byRecipient([
      row({ id: "1", user_id: "digest", type: "new_job" }),
      row({ id: "2", user_id: "both", type: "new_job" }),
      row({ id: "3", user_id: "both" }),
    ])
    expect(groups.map((group) => group[0].user_id)).toEqual(["both", "digest"])
    expect(groups[0]).toHaveLength(2)
  })
})

describe("compose", () => {
  it("uses the line itself as the subject of a single update", () => {
    const email = compose([row()], RECIPIENT, URLS)
    expect(email.to).toBe(RECIPIENT.email)
    expect(email.subject).toBe("Carla applied to “Ada & Ben”!")
    expect(email.text).toContain("https://app.test/jobs/e1/applications")
    expect(email.text).toContain(
      "https://app.test/unsubscribe?token=tok&type=application_received&lang=en",
    )
    expect(email.headers["List-Unsubscribe"]).toBe(
      "<https://db.test/functions/v1/email-unsubscribe?token=tok&type=application_received>",
    )
    expect(email.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    )
  })

  it("merges several updates, and offers to stop them all if they differ", () => {
    const email = compose(
      [row(), row({ id: "n2", type: "job_closed" })],
      RECIPIENT,
      URLS,
    )
    expect(email.subject).toBe("2 updates from Vaitu")
    expect(email.text).toContain("Luca closed “Ada & Ben”")
    expect(email.text).toContain("type=all")
  })

  it("keeps a big digest short", () => {
    const rows = Array.from({ length: 25 }, (_, id) =>
      row({ id: String(id), type: "new_job" }),
    )
    const email = compose(rows, RECIPIENT, URLS)
    expect(email.subject).toBe("25 updates from Vaitu")
    expect(email.text).toContain("…and 5 more in the app")
    expect(email.text).toContain("type=new_job")
  })

  it("lists the updates in HTML, each with its time and a short link", () => {
    const { html, text } = compose(
      [row(), row({ id: "n2", type: "job_closed" })],
      RECIPIENT,
      URLS,
    )
    expect(text.startsWith("Here's what's new for you on Vaitu:")).toBe(true)
    expect(text).toContain("Nov 10, 12:58 PM\nCarla applied to “Ada & Ben”!")
    expect(html).toContain('src="https://app.test/email-logo.png"')
    expect(html).toContain("Nov 10, 12:58 PM")
    expect(html).toContain("Carla applied to “Ada &amp; Ben”!")
    expect(html.match(/>Open →<\/a>/g)).toHaveLength(2)
    expect(html).toContain(
      'href="https://app.test/unsubscribe?token=tok&amp;type=all&amp;lang=en"',
    )
  })

  it("escapes what people typed", () => {
    const { html } = compose(
      [row({ job_title: '<img src=x onerror="alert(1)">' })],
      RECIPIENT,
      URLS,
    )
    expect(html).not.toContain("<img src=x")
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
  })

  it("writes in the recipient's language, or else in English", () => {
    const italian = compose([row({ locale: "it" })], RECIPIENT, URLS)
    expect(italian.html).toContain('lang="it"')
    expect(italian.html).toContain(">Apri →</a>")
    expect(compose([row({ locale: "ar" })], RECIPIENT, URLS).html).toContain(
      'dir="rtl"',
    )
    expect(compose([row({ locale: "xx" })], RECIPIENT, URLS).html).toContain(
      ">Open →</a>",
    )
  })
})

describe("muted lists", () => {
  it("lets one type go, or all of them", () => {
    expect(isMuted([], "new_job")).toBe(false)
    expect(isMuted(["new_job"], "new_job")).toBe(true)
    expect(isMuted(["all"], "new_job")).toBe(true)
    expect(isMuted(["new_job"], "job_closed")).toBe(false)
  })

  it("adds and removes without duplicates", () => {
    expect(withMuted([], "all", false)).toEqual(["all"])
    expect(withMuted(["all", "new_job"], "all", true)).toEqual(["new_job"])
    expect(withMuted(["new_job"], "new_job", false)).toEqual(["new_job"])
  })
})
