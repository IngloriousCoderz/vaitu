import { beforeEach, describe, expect, it, vi } from "vitest"

const { session } = vi.hoisted(() => ({ session: { user: null } }))

vi.mock("../api/session.js", () => ({ readUser: () => session.user }))

const { I18n, i18next } = await import("./index.js")

describe("I18n", () => {
  let entity
  let api

  beforeEach(() => {
    session.user = null
    i18next.changeLanguage("en")
    entity = {}
    I18n.create(entity)
    api = { notify: vi.fn() }
  })

  describe("localeChange", () => {
    it("saves the language to the profile when signed in", () => {
      session.user = { user_id: "u1" }

      I18n.localeChange(entity, "it", api)

      expect(entity.locale).toBe("it")
      expect(api.notify).toHaveBeenCalledWith("#profile:localeSave", "it")
    })

    it("keeps the language for later when signed out", () => {
      I18n.localeChange(entity, "fr", api)

      expect(entity.locale).toBe("fr")
      expect(entity.isUnsaved).toBe(true)
      expect(api.notify).not.toHaveBeenCalled()
    })

    it("saves nothing when the language does not change", () => {
      session.user = { user_id: "u1" }

      I18n.localeChange(entity, "en", api)
      I18n.localeChange(entity, "de", api)

      expect(api.notify).not.toHaveBeenCalled()
    })
  })

  describe("localeSelect", () => {
    it("switches to the language picked in the combobox", () => {
      session.user = { user_id: "u1" }

      I18n.localeSelect(entity, { field: "locale", value: "fr" }, api)

      expect(entity.locale).toBe("fr")
      expect(api.notify).toHaveBeenCalledWith("#profile:localeSave", "fr")
    })
  })

  describe("localeSync", () => {
    it("switches to the profile's language", () => {
      I18n.localeSync(entity, { userId: "u1", locale: "it" }, api)

      expect(entity.locale).toBe("it")
      expect(api.notify).not.toHaveBeenCalled()
    })

    it("saves a language chosen before signing in instead", () => {
      I18n.localeChange(entity, "fr", api)

      I18n.localeSync(entity, { userId: "u1", locale: "it" }, api)

      expect(entity.locale).toBe("fr")
      expect(entity.isUnsaved).toBe(false)
      expect(api.notify).toHaveBeenCalledWith("#profile:localeSave", "fr")
    })

    it("saves the current language when the profile has none", () => {
      I18n.localeSync(entity, { userId: "u1", locale: null }, api)

      expect(api.notify).toHaveBeenCalledWith("#profile:localeSave", "en")
    })

    it("applies only once per user", () => {
      I18n.localeSync(entity, { userId: "u1", locale: "it" }, api)
      I18n.localeSync(entity, { userId: "u1", locale: "fr" }, api)

      expect(entity.locale).toBe("it")

      I18n.localeSync(entity, { userId: "u2", locale: "fr" }, api)

      expect(entity.locale).toBe("fr")
    })
  })
})
