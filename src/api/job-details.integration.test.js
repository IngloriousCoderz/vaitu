import { afterAll, beforeAll, describe, expect, test } from "vitest"

import taxonomy from "../../supabase/functions/_shared/job-taxonomy.json"
import {
  ANTONY,
  createJobAs,
  deleteOwnedJob,
  jobPayload,
  readAsService,
  signIn,
  signOut,
} from "../testing/index.js"
import { supabase } from "./client.js"

const TEST_TIMEOUT_MS = 30000
const CHECK_VIOLATION = "23514"

describe("job details in the database", () => {
  let jobId
  let posterId

  beforeAll(async () => {
    jobId = await createJobAs(ANTONY, `details-${crypto.randomUUID()}`)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    posterId = user.id
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await deleteOwnedJob(jobId)
    await signOut()
  }, TEST_TIMEOUT_MS)

  test("hold the taxonomy the app has: run pnpm taxonomy:snippet when it changes", async () => {
    const [row] = await readAsService("job_taxonomy", "id", true)
    expect(row.taxonomy).toEqual(taxonomy)
  })

  test("accept what the form allows", async () => {
    const error = await updateDetails({
      spouse_first_name_1: "Ada",
      spouse_first_name_2: "Ben",
      styles: ["film", "fine_art"],
      moments: [],
      genres: [],
    })
    expect(error).toBeNull()
  })

  test("refuse a value that is not on its list", async () => {
    expect(await updateDetails({ styles: ["polka"] })).toMatchObject({
      code: CHECK_VIOLATION,
    })
  })

  test("refuse a detail the profession does not have", async () => {
    expect(await updateDetails({ genres: ["jazz"] })).toMatchObject({
      code: CHECK_VIOLATION,
    })
  })

  test("refuse a detail the setting does not have", async () => {
    expect(await updateDetails({ headliner: "Ada" })).toMatchObject({
      code: CHECK_VIOLATION,
    })
  })

  test("refuse text where a list goes, and a list where text goes", async () => {
    expect(await updateDetails({ styles: "film" })).toMatchObject({
      code: CHECK_VIOLATION,
    })
    expect(await updateDetails({ spouse_first_name_1: ["Ada"] })).toMatchObject(
      { code: CHECK_VIOLATION },
    )
  })

  test("refuse a job type that does not exist", async () => {
    await signIn(ANTONY)
    const { details, ...fields } = jobPayload(crypto.randomUUID())
    const { error } = await supabase.from("jobs").insert({
      ...fields,
      details,
      profession: "cleaner",
      poster_id: posterId,
      status: "open",
    })
    expect(error).toMatchObject({ code: CHECK_VIOLATION })
  })

  async function updateDetails(details) {
    await signIn(ANTONY)
    const { error } = await supabase
      .from("jobs")
      .update({ details })
      .eq("id", jobId)
    return error
  }
})
