import { CaptchaError } from "@inglorious/supabase"
import { afterEach, describe, expect, it, vi } from "vitest"

import { errorKey } from "./errors.js"

describe("errorKey", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("says offline when the server couldn't be reached", () => {
    expect(
      errorKey({ message: "TypeError: Failed to fetch" }, "errors.loadJobs"),
    ).toBe("errors.offline")
    vi.stubGlobal("navigator", { onLine: false })
    expect(errorKey(new Error("boom"), "errors.loadJobs")).toBe(
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

  it("falls back for database errors, whose messages aren't for people", () => {
    expect(
      errorKey(
        {
          code: "PGRST116",
          message: "Cannot coerce the result to a single JSON object",
        },
        "errors.loadJob",
      ),
    ).toBe("errors.loadJob")
    expect(
      errorKey(
        { code: "P0001", message: "You cannot apply to your own job." },
        "errors.applicationFailed",
      ),
    ).toBe("errors.applicationFailed")
    expect(
      errorKey({ code: "23505", message: "duplicate key" }, "errors.save"),
    ).toBe("errors.save")
  })

  it("keeps Supabase Auth's own messages, whose codes are words", () => {
    expect(
      errorKey(
        { code: "invalid_credentials", message: "errors.invalidCredentials" },
        "errors.login",
      ),
    ).toBe("errors.invalidCredentials")
  })
})
