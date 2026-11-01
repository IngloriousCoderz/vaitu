import { env } from "./supabase.ts"

const DEFAULT_FROM = "Vaitu <onboarding@resend.dev>"
const SEND_TIMEOUT_MS = 5000
const LOCAL_STACK = /kong|localhost|127\.0\.0\.1/

// The local stack shares the real Resend key, and tests use made-up addresses.
export async function sendEmail(to: string, subject: string, text: string) {
  if (LOCAL_STACK.test(env("SUPABASE_URL"))) {
    console.log("email skipped on the local stack:", subject)
    return
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("ALERT_FROM") ?? DEFAULT_FROM,
      to,
      subject,
      text,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}
