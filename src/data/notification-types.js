export const ALL_TYPES = "all"

export const notificationGroups = [
  { id: "newJobs", types: ["new_job"] },
  {
    id: "posted",
    types: ["application_received", "application_withdrawn", "job_outcome_due"],
  },
  {
    id: "applied",
    types: [
      "application_selected",
      "application_rejected",
      "job_updated",
      "job_closed",
      "job_reviewed",
      "job_cancelled",
    ],
  },
  {
    id: "payments",
    types: [
      "agreement_proposed",
      "agreement_confirmed",
      "agreement_rejected",
      "settlement_due",
      "settlement_contested",
    ],
  },
]

export const notificationTypes = notificationGroups.flatMap(
  (group) => group.types,
)

const APPLICANT_ACTIONS = new Set([
  "application_received",
  "application_withdrawn",
  "agreement_confirmed",
  "agreement_rejected",
])

/** Who did what the notification is about: an applicant, or the poster. */
export function actorName(item) {
  return APPLICANT_ACTIONS.has(item.type)
    ? item.applicant_name
    : item.poster_name
}

export function isMuted(muted, type) {
  return muted.includes(ALL_TYPES) || muted.includes(type)
}

export function withMuted(muted, type, isReceiving) {
  const others = muted.filter((item) => item !== type)
  return isReceiving ? others : [...others, type]
}
