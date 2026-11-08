import { supabaseNativeUpdate } from "@inglorious/supabase"
import { expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import { signOut } from "../testing/index.js"
import { supabase } from "./client.js"

const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000
const ANDROID_MIN_BUILD_TRIED = 999

const nativeUpdate = supabaseNativeUpdate(supabase)

test(
  "the minimum builds are readable before sign-in, and not writable",
  async () => {
    await signOut()
    const android = await nativeUpdate.requirement("android")
    expect(android.minBuild).toBeGreaterThanOrEqual(1)
    expect(android.storeUrl).toContain("it.ingloriouscoderz.vaitu")

    const { data } = await supabase
      .from("app_versions")
      .update({ min_build: ANDROID_MIN_BUILD_TRIED })
      .eq("platform", "android")
      .select()
    expect(data).toEqual([])
    expect((await nativeUpdate.requirement("android")).minBuild).not.toBe(
      ANDROID_MIN_BUILD_TRIED,
    )
  },
  TEST_TIMEOUT_MS,
)
