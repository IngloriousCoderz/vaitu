import { currentLocale } from "../i18n/index.js"

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

// Turnstile tokens last 300 seconds.
const TOKEN_LIFETIME_MS = 270000

export const CAPTCHA_ELEMENT_ID = "captcha"

let loading = null
let prepared = null

/**
 * Starts solving the challenge while the person types, so that
 * `captchaToken(action)` needn't wait for it.
 * @param {string} action
 */
export function prepareCaptcha(action) {
  if (!SITE_KEY) return
  const token = renderToken(action)
  token.catch(() => null)
  prepared = { action, token, at: Date.now() }
}

/**
 * A fresh Turnstile token for Supabase Auth, or undefined when no site key is
 * set, as on the local stack. A token works once, so a prepared one is used
 * at most once and each widget is removed after.
 * @param {string} action
 * @returns {Promise<string | undefined>}
 */
export async function captchaToken(action) {
  if (!SITE_KEY) return undefined
  const ready = prepared
  prepared = null
  if (ready?.action === action && Date.now() - ready.at < TOKEN_LIFETIME_MS) {
    const token = await ready.token.catch(() => null)
    if (token) return token
  }
  return renderToken(action)
}

async function renderToken(action) {
  const turnstile = await loadTurnstile()
  const element = document.getElementById(CAPTCHA_ELEMENT_ID)
  if (!element) throw new Error("errors.captcha")

  return new Promise((resolve, reject) => {
    const fail = () => {
      turnstile.remove(widgetId)
      reject(new Error("errors.captcha"))
      return true
    }
    const widgetId = turnstile.render(element, {
      sitekey: SITE_KEY,
      action,
      appearance: "interaction-only",
      language: currentLocale(),
      callback(token) {
        turnstile.remove(widgetId)
        resolve(token)
      },
      "error-callback": fail,
      "expired-callback": fail,
      "timeout-callback": fail,
      "unsupported-callback": fail,
    })
  })
}

function loadTurnstile() {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error("errors.captcha"))
    }
    document.head.append(script)
  })
  return loading
}
