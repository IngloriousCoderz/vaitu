// Apart from alerts.ts, which reads the environment and the database, so that
// tests can run this.

const LIMIT_STATUSES: Record<string, number[]> = {
  // 404 is every model in the list having been withdrawn from the free tier.
  openrouter: [402, 404, 429],
  deepgram: [402, 429],
  resend: [429],
}

const WHAT_STOPS: Record<string, string> = {
  openrouter:
    "Voice messages are no longer filling in the event form. People see an error and fill it in by hand.",
  deepgram:
    "Voice messages are no longer being transcribed. People see an error and fill in the event form by hand.",
  resend:
    "Notification emails are waiting for tomorrow's allowance, and new job digests may arrive late. After three days unsent ones are dropped; the bell still has them.",
}

export interface AlertSteps {
  claim: (key: string) => Promise<boolean>
  release: (key: string) => Promise<void>
  send: (subject: string, text: string) => Promise<void>
}

export function isLimitStatus(service: string, status: number) {
  return LIMIT_STATUSES[service]?.includes(status) ?? false
}

/** @returns whether an email went out. */
export async function alertOnLimit(
  service: string,
  status: number,
  steps: AlertSteps,
) {
  if (!isLimitStatus(service, status)) return false
  return await alertOnce(
    `${service}-limit`,
    `Vaitu: ${service} limit reached (${status})`,
    `${service} answered ${status}. ${WHAT_STOPS[service]}`,
    steps,
  )
}

/** @returns whether an email went out: at most one a day per key. */
export async function alertOnce(
  key: string,
  subject: string,
  text: string,
  { claim, release, send }: AlertSteps,
) {
  if (!(await claim(key))) return false
  try {
    await send(subject, `${text}\n\nThis alert is sent at most once a day.`)
    return true
  } catch (err) {
    await release(key)
    throw err
  }
}
