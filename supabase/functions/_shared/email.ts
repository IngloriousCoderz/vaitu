import { env } from "./supabase.ts"

const DEFAULT_FROM = "Vaitu <onboarding@resend.dev>"
const SEND_TIMEOUT_MS = 5000
const BATCH_TIMEOUT_MS = 30000
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

export interface Email {
  to: string
  subject: string
  text: string
  headers?: Record<string, string>
}

// One request whatever the number of emails, so the rate limit never splits a
// batch. Up to 100 emails, sent or refused together.
export async function sendEmails(emails: Email[]) {
  if (!emails.length) return
  if (LOCAL_STACK.test(env("SUPABASE_URL"))) {
    console.log(`${emails.length} emails skipped on the local stack`)
    return
  }
  const from = Deno.env.get("ALERT_FROM") ?? DEFAULT_FROM
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emails.map((email) => ({ from, ...email }))),
    signal: AbortSignal.timeout(BATCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new EmailError(res.status, await res.text())
}

export class EmailError extends Error {
  status: number

  constructor(status: number, detail: string) {
    super(`Resend ${status}: ${detail}`)
    this.status = status
  }
}
