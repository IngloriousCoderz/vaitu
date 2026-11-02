import {
  type Email,
  env,
  isLocalStack,
  sendEmail as sendOne,
  sendEmails as sendBatch,
} from "npm:@inglorious/supabase@^0.2.0/edge"

const DEFAULT_FROM = "Vaitu <onboarding@resend.dev>"

// The local stack shares the real Resend key, and tests use made-up addresses.
export async function sendEmail(to: string, subject: string, text: string) {
  if (isLocalStack(env("SUPABASE_URL"))) {
    console.log("email skipped on the local stack:", subject)
    return
  }
  await sendOne({ to, subject, text }, resend())
}

export async function sendEmails(emails: Email[]) {
  if (!emails.length) return
  if (isLocalStack(env("SUPABASE_URL"))) {
    console.log(`${emails.length} emails skipped on the local stack`)
    return
  }
  await sendBatch(emails, resend())
}

function resend() {
  return {
    apiKey: env("RESEND_API_KEY"),
    from: Deno.env.get("ALERT_FROM") ?? DEFAULT_FROM,
  }
}
