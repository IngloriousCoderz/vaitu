// Routing smoke test. Run against a served build:
//
//   pnpm build && pnpm preview --port 4399
//   node scripts/routing-smoke.mjs
//
// Needs Playwright, which this app does not depend on. From a checkout that has
// it (the monorepo's examples/apps/web-motion does), run it as:
//
//   cd ../inglorious-forge/examples/apps/web-motion && node <path-to-this-file>
//
// It covers the signed-out half of the router: which paths are guarded, where
// they land, and that the login route renders on its own. It does not cover the
// signed-in shell — tab bar, FAB and per-route chrome — because that needs a
// session, and Supabase's client will not accept a hand-seeded one. Run the app
// against a local Supabase to check that half by hand.

import { chromium } from "@playwright/test"

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:4399"
const WAIT = { timeout: 15000, polling: 100 }
const results = []
const check = (label, pass, detail = "") => {
  const line = `${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`
  results.push(line)
  console.log(line)
}

// The bundled browser revision is resolved lazily, so a machine with a
// different revision installed needs PLAYWRIGHT_CHROMIUM pointed at one.
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
    : {},
)
const page = await browser.newPage()
const errors = []
const path = () => page.evaluate(() => location.pathname)
page.on("pageerror", (e) => errors.push(e.message))

// Anything under auth answers signed-out, so the session resolves without a
// backend and the guard has something to act on.
await page.route("**/auth/v1/**", (route) =>
  route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ message: "signed out" }),
  }),
)

// Every route that requires a visitor to be signed in must end up on /login,
// including the catch-all.
for (const guarded of [
  "/",
  "/events",
  "/events/abc",
  "/events/new",
  "/events/abc/edit",
  "/events/abc/applications",
  "/applications",
  "/applications/xyz",
  "/profile",
  "/ranks",
  "/nope",
]) {
  await page.goto(BASE + guarded)
  await page
    .waitForFunction(() => location.pathname === "/login", undefined, WAIT)
    .catch(() => {})
  check(`${guarded} lands on /login`, (await path()) === "/login", await path())
}

await page.goto(BASE + "/login")
await page.waitForTimeout(1000)
check("/login stays put", (await path()) === "/login")

const body = await page.evaluate(() => document.body.innerText)
check("login form renders", /enter your email/i.test(body))
check(
  "pre-login route has no tab bar",
  (await page.locator("nav").count()) === 0,
)
check("splash is gone", !/vaitu-splash/.test(body))
check("no page errors", errors.length === 0, errors.slice(0, 3).join("; "))

await browser.close()
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0)
