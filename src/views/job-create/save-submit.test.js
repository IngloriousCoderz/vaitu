import { createStore } from "@inglorious/store"
import { describe, expect, it } from "vitest"

import { JobCreate } from "./index.js"

const WEDDING = {
  setting: "wedding",
  profession: "photographer",
  location: "Masseria Torre Coccaro",
  country: "Italy",
  region: "Puglia",
  job_date: "2099-06-12",
  application_deadline: "2099-05-01T23:59",
  max_applicants: 3,
  description: "",
  pay_kind: "to_agree",
  details: {
    spouse_first_name_1: "Alessia",
    spouse_first_name_2: "Tommaso",
    styles: ["reportage", "fine_art"],
  },
}

describe("saveSubmit", () => {
  it("hands the save details it can still read after the update", () => {
    let saved = null
    const store = createStore({
      types: {
        JobCreate: {
          ...JobCreate,
          save(entity, job) {
            saved = job
          },
        },
      },
      entities: { jobCreate: { type: "JobCreate" } },
    })
    const { details, ...fields } = WEDDING
    for (const [field, value] of Object.entries(fields)) {
      store.notify("#jobCreate:fieldSet", { field, value })
    }
    store.notify("#jobCreate:detailFieldSet", {
      field: "spouse_first_name_1",
      value: details.spouse_first_name_1,
    })
    store.notify("#jobCreate:detailFieldSet", {
      field: "spouse_first_name_2",
      value: details.spouse_first_name_2,
    })
    for (const style of details.styles) {
      store.notify("#jobCreate:detailToggle", { field: "styles", value: style })
    }

    store.notify("#jobCreate:saveSubmit")

    expect(Array.isArray(saved.details.styles)).toBe(true)
    expect(saved.details).toEqual(WEDDING.details)
  })
})
