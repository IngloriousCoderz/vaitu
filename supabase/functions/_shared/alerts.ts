import { alertOnLimit, isLimitStatus } from "./limit-alert.ts"
import { admin, env } from "./supabase.ts"

const DEFAULT_FROM = "Vaitu <onboarding@resend.dev>"
const SEND_TIMEOUT_MS = 5000

// An alert is a courtesy to the owner: it never changes what the user gets.
export async function alertProviderLimit(service: string, status: number) {
  if (!isLimitStatus(service, status)) return
  try {
    const apiKey = env("RESEND_API_KEY")
    const to = env("ALERT_EMAIL")
    const from = Deno.env.get("ALERT_FROM") ?? DEFAULT_FROM
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
      async send(subject, text) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to, subject, text }),
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        })
        if (!res.ok)
          throw new Error(`Resend ${res.status}: ${await res.text()}`)
      },
    })
  } catch (err) {
    console.error("alert failed", err)
  }
}
