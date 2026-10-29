import { decodeBase64 } from "jsr:@std/encoding@1/base64"
import { encodeBase64Url } from "jsr:@std/encoding@1/base64url"

import { upstreamError } from "../_shared/http.ts"
import { env } from "../_shared/supabase.ts"

// Firebase Cloud Messaging's HTTP v1 API, which reaches browsers, Android and
// iOS alike. It takes an OAuth access token, which the service account in the
// FCM_SERVICE_ACCOUNT secret (the JSON file Firebase hands out) gets from
// Google by signing a short-lived JWT.

interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

export interface FcmMessage {
  token: string
  notification?: { title: string; body: string }
  data: Record<string, string>
  android?: { priority: "high" }
  webpush?: { headers: Record<string, string> }
}

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
const MS_PER_SECOND = 1000
// Google's limit for the JWT, and so for the access token it buys.
const TOKEN_LIFETIME_S = 3600
// Renewed this long before it runs out, so no send starts with a dying token.
const RENEW_MARGIN_S = 60

let access: { token: string; expiresAt: number } | null = null

/** Sends one message; the response is the caller's to read. */
export async function send(message: FcmMessage) {
  const account: ServiceAccount = JSON.parse(env("FCM_SERVICE_ACCOUNT"))
  return fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken(account)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    },
  )
}

// One token serves every send until it nears its end, across the requests a
// worker handles.
async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / MS_PER_SECOND)
  if (access && access.expiresAt - RENEW_MARGIN_S > now) return access.token

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: await signedJwt(account, now),
    }),
  })
  if (!res.ok) throw await upstreamError("Google OAuth", res)
  const { access_token, expires_in } = await res.json()
  access = { token: access_token, expiresAt: now + expires_in }
  return access_token
}

async function signedJwt(account: ServiceAccount, now: number) {
  const header = part({ alg: "RS256", typ: "JWT" })
  const claims = part({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + TOKEN_LIFETIME_S,
  })
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBody(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  )
  return `${header}.${claims}.${encodeBase64Url(signature)}`
}

function part(value: unknown) {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)))
}

// The key's DER bytes, from the PEM text between its BEGIN and END lines.
function pemBody(pem: string) {
  return decodeBase64(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""))
}
