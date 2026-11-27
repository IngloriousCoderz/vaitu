import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"

import { detailLabel } from "../../data/job-taxonomy.js"
import { currentLocale, t } from "../../i18n/index.js"
import { detailsFor } from "../../views/job-list/job-settings.js"
import { jobTypeTags } from "../job-card/index.js"
import { formatFee, formatPay } from "../pay.js"
import styles from "./style.module.css"

/**
 * Everything a colleague needs to decide on a job, as label and value pairs.
 * Pay only when it was loaded: visitors never see it.
 * @param {Record<string, any>} job - A job view model (see toViewModel).
 */
export function jobFacts(job) {
  const [setting, profession] = jobTypeTags(job)
  const details = job.details ?? {}
  const fee = job.seeking === "substitute" ? formatFee(job.pay) : null
  return [
    [t("facts.seeking"), t(`pay.seekingKinds.${job.seeking}`)],
    [t("fields.setting"), setting],
    [t("fields.profession"), profession],
    ...(job.facts ?? [])
      .filter((fact) => fact.label !== "fields.region")
      .map((fact) => [t(fact.label), fact.value]),
    ...detailsFor(job).flatMap((detail) => {
      const values = details[detail.id] ?? []
      return values.length
        ? [[detail.label, values.map(detailLabel).join(", ")]]
        : []
    }),
    [t("facts.place"), place(job)],
    [t("facts.jobDate"), formatDay(job.job_date)],
    [t("facts.deadline"), formatInstant(job.application_deadline)],
    ...(job.pay !== undefined && job.pay !== null
      ? [[t(`facts.pay.${job.seeking}`), formatPay(job.pay)]]
      : []),
    ...(fee ? [[t("facts.fee"), fee]] : []),
    ...(job.maxApplicants ? [[t("facts.shortlist"), job.maxApplicants]] : []),
  ].filter(([, value]) => value)
}

export const JobFacts = {
  /** @param {{ job: Record<string, any> }} props */
  render({ job }) {
    return html`
      <dl class=${styles.facts}>
        ${jobFacts(job).map(([label, value]) =>
          Flex.render({
            className: styles.fact,
            children: html`
              <dt>${label}</dt>
              <dd>${value}</dd>
            `,
          }),
        )}
      </dl>
    `
  },
}

function place(job) {
  const parts = [job.location, job.region, job.country].filter(Boolean)
  return [...new Set(parts)].join(", ")
}

function formatDay(iso) {
  if (!iso) return null
  return new Date(`${iso}T00:00`).toLocaleDateString(currentLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatInstant(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString(currentLocale(), {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  })
}
