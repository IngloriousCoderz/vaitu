import { describe, expect, it, vi } from "vitest"

import {
  alertOnce,
  alertOnLimit,
} from "../../supabase/functions/_shared/limit-alert.ts"

function steps(isClaimed = true) {
  return {
    claim: vi.fn().mockResolvedValue(isClaimed),
    release: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
  }
}

describe("alertOnLimit", () => {
  it.each([
    ["openrouter", 429],
    ["openrouter", 402],
    ["openrouter", 404],
    ["deepgram", 429],
    ["deepgram", 402],
  ])("emails about %s answering %i", async (service, status) => {
    const given = steps()
    expect(await alertOnLimit(service, status, given)).toBe(true)
    expect(given.claim).toHaveBeenCalledWith(`${service}-limit`)
    expect(given.send.mock.calls[0][0]).toContain(`${service} limit`)
  })

  it.each([
    ["openrouter", 500],
    ["openrouter", 401],
    ["deepgram", 404],
    ["deepgram", 500],
    ["unknown", 429],
  ])("stays quiet about %s answering %i", async (service, status) => {
    const given = steps()
    expect(await alertOnLimit(service, status, given)).toBe(false)
    expect(given.claim).not.toHaveBeenCalled()
    expect(given.send).not.toHaveBeenCalled()
  })

  it("sends nothing when today's alert already went out", async () => {
    const given = steps(false)
    expect(await alertOnLimit("openrouter", 429, given)).toBe(false)
    expect(given.send).not.toHaveBeenCalled()
  })

  it("gives the claim back when sending fails, so the next failure retries", async () => {
    const given = steps()
    given.send.mockRejectedValue(new Error("Resend 500"))
    await expect(alertOnLimit("deepgram", 402, given)).rejects.toThrow(
      "Resend 500",
    )
    expect(given.release).toHaveBeenCalledWith("deepgram-limit")
  })
})

describe("alertOnce", () => {
  it("sends under its own key, once a day", async () => {
    const given = steps()
    expect(await alertOnce("voice-budget", "Paused", "Used up", given)).toBe(
      true,
    )
    expect(given.claim).toHaveBeenCalledWith("voice-budget")
    expect(given.send).toHaveBeenCalledWith(
      "Paused",
      expect.stringContaining("Used up"),
    )
  })
})
