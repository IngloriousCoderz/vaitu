import { describe, expect, it } from "vitest"

import wording from "../../../supabase/functions/deactivate-account/wording.json"

const catalogues = import.meta.glob("../../i18n/locales/*.json", {
  eager: true,
})

describe("deactivate-account's copy of the email", () => {
  it("says what the catalogues say, in every language", () => {
    expect(wording).toEqual(
      Object.fromEntries(
        Object.entries(catalogues).map(([path, catalogue]) => [
          path.match(/(\w+)\.json$/)[1],
          catalogue.default.accountEmail,
        ]),
      ),
    )
  })

  it.each(Object.entries(wording))(
    "%s has a place for the link",
    (_, lines) => {
      expect(lines.body).toContain("{{link}}")
    },
  )
})
