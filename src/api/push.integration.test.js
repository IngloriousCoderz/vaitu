import { afterAll, describe, expect, test } from "vitest"

import { SEEKER, SENDER, signIn, signOut } from "../testing/index.js"
import { supabase } from "./client.js"
import { deletePushSubscription, savePushSubscription } from "./push.js"

// A browser's PushSubscription as JSON. The push service never sees it: these
// tests only file it, and no notification is created along the way.
const subscription = {
  endpoint: `https://push.example.com/vitest-${crypto.randomUUID()}`,
  keys: { p256dh: "vitest-p256dh", auth: "vitest-auth" },
}

async function ownEndpoints() {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint")
    .eq("endpoint", subscription.endpoint)
  if (error) throw error
  return data
}

describe("push subscriptions", () => {
  afterAll(async () => {
    await signIn(SENDER)
    await deletePushSubscription(subscription.endpoint)
    await signOut()
  })

  test("a browser is filed under whoever signed in there", async () => {
    await signIn(SEEKER)
    await savePushSubscription(subscription)
    expect(await ownEndpoints()).toHaveLength(1)

    // Filing it again, as every sign-in does, changes nothing.
    await savePushSubscription(subscription)
    expect(await ownEndpoints()).toHaveLength(1)
  })

  // The seeker's sign-out never reached the server: the next user of the
  // browser takes the endpoint over, and the seeker stops getting pushes there.
  test("the next user of the browser takes it over", async () => {
    await signIn(SENDER)
    await savePushSubscription(subscription)
    expect(await ownEndpoints()).toHaveLength(1)

    await signIn(SEEKER)
    expect(await ownEndpoints()).toHaveLength(0)
  })

  test("nobody files a browser signed out, or writes the table directly", async () => {
    await signIn(SEEKER)
    const { error: insertError } = await supabase
      .from("push_subscriptions")
      .insert({
        endpoint: `${subscription.endpoint}-direct`,
        user_id: (await supabase.auth.getUser()).data.user.id,
        p256dh: "x",
        auth: "x",
      })
    expect(insertError).not.toBeNull()

    await signOut()
    await expect(savePushSubscription(subscription)).rejects.toThrow()
  })
})
