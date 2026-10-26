import { expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { signOut } from "../testing/index.js"
import { fetchAppVersion } from "./app-versions.js"
import { supabase } from "./client.js"

const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000

test(
  "the minimum builds are readable before sign-in, and not writable",
  async () => {
    await signOut()
    const android = await fetchAppVersion("android")
    expect(android.min_build).toBeGreaterThanOrEqual(1)
    expect(android.store_url).toContain("it.ingloriouscoderz.vaitu")

    const { data } = await supabase
      .from("app_versions")
      .update({ min_build: 999 })
      .eq("platform", "android")
      .select()
    expect(data).toEqual([])
    expect((await fetchAppVersion("android")).min_build).not.toBe(999)
  },
  TEST_TIMEOUT_MS,
)
