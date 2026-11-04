import { CaptchaError } from "@inglorious/supabase"
import { afterEach, describe, expect, it, vi } from "vitest"

import { errorKey } from "./errors.js"

describe("errorKey", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("says offline when the server couldn't be reached", () => {
    expect(
      errorKey({ message: "TypeError: Failed to fetch" }, "errors.loadEvents"),
    ).toBe("errors.offline")
    vi.stubGlobal("navigator", { onLine: false })
    expect(errorKey(new Error("boom"), "errors.loadEvents")).toBe(
      "errors.offline",
    )
  })

  it("says the bot check failed when Supabase Auth rejects the token", () => {
    expect(
      errorKey(
        {
          code: "captcha_failed",
          message: "captcha protection: request disallowed",
        },
        "errors.login",
      ),
    ).toBe("errors.captcha")
  })

  it("says the bot check failed when the widget did", () => {
    expect(errorKey(new CaptchaError("timeout"), "errors.login")).toBe(
      "errors.captcha",
    )
  })

  it("asks for another password when Supabase Auth finds it leaked", () => {
    expect(
      errorKey(
        { code: "weak_password", message: "Password is known to be weak" },
        "errors.signup",
      ),
    ).toBe("errors.weakPassword")
  })

  it("keeps the error's own message, else the fallback", () => {
    expect(errorKey(new Error("errors.voiceLimit"), "errors.save")).toBe(
      "errors.voiceLimit",
    )
    expect(errorKey({}, "errors.save")).toBe("errors.save")
  })
})
