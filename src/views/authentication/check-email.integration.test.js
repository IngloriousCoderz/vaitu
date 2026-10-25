// Calls the local check-email function with the public key. Each case sends
// its own address in x-forwarded-for, because the limit is 20 attempts per
// hashed client IP. The service role only deletes those rows afterwards.

import { afterAll, expect, test } from "vitest"

import { supabase } from "../../api/client.js"
import { deleteCheckEmailLimit, SEEKER } from "../../testing/index.js"

const ATTEMPT_LIMIT = 20
const TEST_TIMEOUT_MS = 60000

const ips = []

afterAll(async () => {
  for (const ip of ips) await deleteCheckEmailLimit(await ipHash(ip))
}, TEST_TIMEOUT_MS)

test(
  "an existing account is reported",
  async () => {
    const ip = forwardedFor()
    const { data, error } = await checkEmail(SEEKER.email, ip)
    expect(error).toBeNull()
    expect(data).toEqual({ exists: true })
  },
  TEST_TIMEOUT_MS,
)

test(
  "an unknown address is free",
  async () => {
    const ip = forwardedFor()
    const email = `vitest-${crypto.randomUUID()}@vaitu.local`
    const { data, error } = await checkEmail(email, ip)
    expect(error).toBeNull()
    expect(data).toEqual({ exists: false })
  },
  TEST_TIMEOUT_MS,
)

test(
  "the attempt limit refuses another check",
  async () => {
    const ip = forwardedFor()
    const email = `vitest-${crypto.randomUUID()}@vaitu.local`
    for (let attempt = 1; attempt <= ATTEMPT_LIMIT; attempt += 1) {
      const { error } = await checkEmail(email, ip)
      expect(error, `attempt ${attempt}`).toBeNull()
    }

    const { response } = await checkEmail(email, ip)
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain("Too many attempts")
  },
  TEST_TIMEOUT_MS,
)

function forwardedFor() {
  const ip = `vitest-${crypto.randomUUID()}`
  ips.push(ip)
  return ip
}

function checkEmail(email, ip) {
  return supabase.functions.invoke("check-email", {
    body: { email },
    headers: { "x-forwarded-for": ip },
  })
}

async function ipHash(ip) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
