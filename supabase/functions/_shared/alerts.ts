import { env } from "npm:@inglorious/supabase@^0.2.0/edge"

import { sendEmail } from "./email.ts"
import {
  alertOnce,
  alertOnLimit,
  type AlertSteps,
  isLimitStatus,
} from "./limit-alert.ts"
import { admin } from "./supabase.ts"

// An alert is a courtesy to the owner: it never changes what the user gets.
export async function alertProviderLimit(service: string, status: number) {
  if (!isLimitStatus(service, status)) return
  await alertOwner((steps) => alertOnLimit(service, status, steps))
}

export async function alertVoiceBudget() {
  await alertOwner((steps) =>
    alertOnce(
      "voice-budget",
      "Vaitu: voice messages paused for today",
      "Today's minutes of transcription (voice_daily_minutes in app_config) are used up. People see that voice messages are paused, and fill in the event form by hand until midnight UTC.",
      steps,
    ),
  )
}

async function alertOwner(alert: (steps: AlertSteps) => Promise<boolean>) {
  try {
    const to = env("ALERT_EMAIL")
    const db = admin()

    await alert({
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
