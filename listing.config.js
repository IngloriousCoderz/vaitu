const JOB = "93a945ab-5c8c-430d-97d2-326752e79cf4"
const MY_JOB = "fa14e307-350f-4035-8714-ec0781d04ad4"
const WON = "b5af73a1-f8ee-474c-872d-1da5be0783f9"
const LANGUAGES = { en: /english/i, it: /italiano/i }

/** @type {import("@inglorious/capacitor").ListingConfig} */
export default {
  url: "http://localhost:5200",
  locales: ["en", "it"],
  localeParam: "lang",
  devices: ["iphone-6.9", "android", "tablet-7", "tablet-10"],
  storage: {
    "vaitu-analytics": { consent: "denied" },
    "vaitu-push": { isDeclined: true },
  },

  // Choosing the language before signing in saves it to the account, which
  // otherwise brings back its own once the profile loads.
  async signIn(page, { url, locale }) {
    await page.goto(`${url}/login?lang=${locale === "it" ? "en" : "it"}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: LANGUAGES[locale] }).click()
    await page.waitForFunction(
      (expected) => document.documentElement.lang === expected,
      locale,
    )
    await page.fill('input[type="email"]', "sara@showcase.local")
    await page.keyboard.press("Enter")
    await page.fill('input[type="password"]', "vaitu-local")
    const localeSaved = page.waitForResponse(
      (response) =>
        response.url().includes("/rest/v1/profiles") &&
        response.request().method() === "PATCH",
    )
    await page.keyboard.press("Enter")
    await localeSaved
  },

  screens: [
    { name: "01-feed", path: "/jobs" },
    { name: "02-job", path: `/jobs/${JOB}` },
    {
      name: "03-applicants",
      path: `/jobs/${MY_JOB}/applications`,
      async prepare(page) {
        const applicant = page.getByText("Luca Moretti").first()
        await applicant.click()
        await applicant.scrollIntoViewIfNeeded()
        await page.waitForTimeout(600)
      },
    },
    { name: "04-agreement", path: `/applications/${WON}` },
    {
      name: "05-new-job",
      path: "/jobs/new",
      async prepare(page) {
        await page.getByLabel(/primo sposo|Spouse 1/i).fill("Chiara")
        await page.getByLabel(/secondo sposo|Spouse 2/i).fill("Matteo")
        await page
          .getByPlaceholder(/location|venue/i)
          .fill("Borgo Egnazia, Savelletri")
        for (const style of [/^Reportage$/, /^Editorial/]) {
          await page
            .getByRole("checkbox", { name: style })
            .or(page.getByRole("button", { name: style }))
            .first()
            .click()
        }
        await page.evaluate(() => document.activeElement?.blur())
      },
    },
    { name: "06-notifications", path: "/notifications" },
    { name: "07-ranks", path: "/ranks" },
  ],

  promo: {
    tagline: {
      en: "Can't make it?\nTell a colleague “vai tu”.",
      it: "Non puoi esserci più?\nDi' a un collega: “vai tu”.",
    },
    subtitle: {
      en: "Pass on the jobs you can't take, and find the ones you can.",
      it: "Passa i lavori che non puoi fare, trova quelli che puoi fare.",
    },
    screens: ["01-feed", "03-applicants"],
    color: "#22301f",
    accent: "#b4532a",
    font: "Georgia, 'Times New Roman', serif",
  },
}
