import { sendEmail } from "./email.ts"
import { alertOnLimit, isLimitStatus } from "./limit-alert.ts"
import { admin, env } from "./supabase.ts"

// An alert is a courtesy to the owner: it never changes what the user gets.
export async function alertProviderLimit(service: string, status: number) {
  if (!isLimitStatus(service, status)) return
  try {
    const to = env("ALERT_EMAIL")
    const db = admin()

    await alertOnLimit(service, status, {
      async claim(key) {
        const { data, error } = await db.rpc("claim_alert", { p_key: key })
        if (error) throw error
        return data
      },
      async release(key) {
        await db.from("alert_log").delete().eq("key", key)
      },
      send: (subject, text) => sendEmail(to, subject, text),
    })
  } catch (err) {
    console.error("alert failed", err)
  }
}
