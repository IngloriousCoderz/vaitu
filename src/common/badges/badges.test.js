import { beforeAll, describe, expect, it } from "vitest"

import { ready } from "../../i18n/index.js"
import { defaultTiers } from "../tiers.js"
import { badgeDescription, BADGES } from "./index.js"

const catalogues = import.meta.glob("../../i18n/locales/*.json", {
  eager: true,
})

describe("badges", () => {
  it.each(Object.entries(catalogues))(
    "%s words every badge",
    (_, catalogue) => {
      for (const badge of BADGES) {
        expect(catalogue.default.reputation.badges[badge]).toEqual({
          label: expect.any(String),
          description: expect.any(String),
        })
      }
    },
  )
})

describe("badgeDescription", () => {
  beforeAll(() => ready)

  const tiers = {
    ...defaultTiers(),
    serialWithdrawerMinWithdrawals: 7,
    serialWithdrawerMinPercent: 40,
    topRatedMinTenths: 42,
  }

  it("reads the thresholds it is given", () => {
    expect(badgeDescription("serial_withdrawer", tiers)).toBe(
      "7+ applications withdrawn, and at least 40% of those sent.",
    )
    expect(badgeDescription("top_rated", tiers)).toContain("4.2★")
  })

  it.each(BADGES)("leaves no placeholder unfilled in %s", (badge) => {
    expect(badgeDescription(badge, tiers)).not.toContain("{{")
  })
})
