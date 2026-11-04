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

export function isMuted(muted, type) {
  return muted.includes(ALL_TYPES) || muted.includes(type)
}

export function withMuted(muted, type, isReceiving) {
  const others = muted.filter((item) => item !== type)
  return isReceiving ? others : [...others, type]
}
