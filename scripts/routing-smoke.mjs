import { chromium } from "@playwright/test"

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:4399"
const WAIT = { timeout: 15000, polling: 100 }
const results = []
const check = (label, pass, detail = "") => {
  const line = `${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`
  results.push(line)
  console.log(line)
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
    : {},
)
const page = await browser.newPage()
const errors = []
const path = () => page.evaluate(() => location.pathname)
page.on("pageerror", (e) => errors.push(e.message))

await page.route("**/auth/v1/**", (route) =>
  route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ message: "signed out" }),
  }),
)

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
