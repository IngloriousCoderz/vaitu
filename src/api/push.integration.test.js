import { afterAll, describe, expect, test } from "vitest"

import { SEEKER, SENDER, signIn, signOut } from "../testing/index.js"
import { supabase } from "./client.js"
import { deletePushToken, savePushToken } from "./push.js"

const token = `vitest-${crypto.randomUUID()}`

async function ownTokens() {
  const { data, error } = await supabase
    .from("push_tokens")
    .select("token, platform")
    .eq("token", token)
  if (error) throw error
  return data
}

describe("push tokens", () => {
  afterAll(async () => {
    await signIn(SENDER)
    await deletePushToken(token)
    await signOut()
  })

  test("a device is filed under whoever signed in there", async () => {
    await signIn(SEEKER)
    await savePushToken(token, "web")
    expect(await ownTokens()).toEqual([{ token, platform: "web" }])

    await savePushToken(token, "web")
    expect(await ownTokens()).toHaveLength(1)
  })

  test("the next user of the device takes it over", async () => {
    await signIn(SENDER)
    await savePushToken(token, "web")
    expect(await ownTokens()).toHaveLength(1)

    await signIn(SEEKER)
    expect(await ownTokens()).toHaveLength(0)
  })

  test("only the platforms push-notify knows how to word for", async () => {
    await signIn(SEEKER)
    await expect(savePushToken(`${token}-other`, "windows")).rejects.toThrow()
  })

  test("nobody files a device signed out, or writes the table directly", async () => {
    await signIn(SEEKER)
    const { error: insertError } = await supabase.from("push_tokens").insert({
      token: `${token}-direct`,
      user_id: (await supabase.auth.getUser()).data.user.id,
      platform: "web",
    })
    expect(insertError).not.toBeNull()

    await signOut()
    await expect(savePushToken(token, "web")).rejects.toThrow()
  })
})
