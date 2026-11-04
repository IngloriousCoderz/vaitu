// Copies of the app's taxonomy and create form: a function cannot import app
// source. src/views/job-create/parse-job.test.js fails when they drift.

const SETTINGS_BY_PROFESSION = {
  photographer: ["wedding", "festival", "concert"],
  videographer: ["wedding", "festival", "concert"],
  musician: ["wedding", "festival", "concert"],
  dj: ["wedding", "festival"],
  sound_technician: ["festival", "concert"],
  planner: ["wedding"],
  makeup_artist: ["wedding"],
  cleaner: ["apartment", "house", "office"],
  electrician: ["apartment", "house", "office"],
}

export const WEDDING_STYLES = [
  "editorial",
  "documentary",
  "reportage",
  "classic",
  "film",
  "fine_art",
]

export const MUSIC_GENRES = [
  "house",
  "techno",
  "indie",
  "jazz",
  "electronic",
  "rock",
  "pop",
  "classical",
]

export const JOB_TYPES_WITHOUT_STYLE = [
  "wedding_planner",
  "wedding_makeup_artist",
]

// null means free text, a list the only values allowed.
export const DETAILS_BY_CATEGORY: Record<
  string,
  Record<string, string[] | null>
> = {
  wedding: {
    spouse_first_name_1: null,
    spouse_first_name_2: null,
    style: WEDDING_STYLES,
  },
  festival: { headliner: null, genre: MUSIC_GENRES },
  concert: { headliner: null, genre: MUSIC_GENRES },
  apartment: {},
  house: {},
  office: {},
}

export const JOB_TYPES = Object.entries(SETTINGS_BY_PROFESSION).flatMap(
  ([profession, settings]) =>
    settings.map((category) => `${category}_${profession}`),
)

export const CURRENCIES = [
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BZD",
  "CAD",
  "CDF",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CUP",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ERN",
  "ETB",
  "EUR",
  "FJD",
  "FKP",
  "GBP",
  "GEL",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HKD",
  "HNL",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  "JMD",
  "JOD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KPW",
  "KRW",
  "KWD",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "LYD",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SGD",
  "SHP",
  "SLE",
  "SOS",
  "SRD",
  "SSP",
  "STN",
  "SVC",
  "SYP",
  "SZL",
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "USD",
  "UYU",
  "UZS",
  "VES",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XCD",
  "XCG",
  "XOF",
  "XPF",
  "YER",
  "ZAR",
  "ZMW",
  "ZWG",
]

export const TITLED_CATEGORIES = [
  "festival",
  "concert",
  "apartment",
  "house",
  "office",
]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const NO_AMOUNT = 0

export function offeredJobTypes(requested: unknown) {
  if (!Array.isArray(requested)) return JOB_TYPES
  const offered = JOB_TYPES.filter((id) => requested.includes(id))
  return offered.length ? offered : JOB_TYPES
}

export function systemPrompt(
  today: string,
  jobTypes: string[],
  current: string | null,
) {
  const keep = current
    ? `The form is set to "${current}": keep it unless the transcript clearly describes another of the listed job types.`
    : "Pick the listed job type the transcript describes, or null when it does not say."

  return `A professional is passing on a job they cannot take. You extract the job's data from their voice transcript, which can be in any language.
Today is ${today}.
Respond with JSON only, no other text, using exactly these keys (null when unknown):
{
  "job_type": ${jobTypes.map((id) => `"${id}"`).join(" | ")} | null,
  "title": string | null,
  "location": string | null,
  "country": string | null,
  "region": string | null,
  "job_date": "YYYY-MM-DD" | null,
  "details": object,
  "pay": { "kind": "fixed" | "range", "amount_min": number, "amount_max": number | null, "currency": string | null } | null
}
A job type is its category, an underscore and the profession. "details" depends on the category:
- wedding: { "spouse_first_name_1": string | null, "spouse_first_name_2": string | null, "style": ${oneOf(WEDDING_STYLES)} | null }
- festival, concert: { "headliner": string | null, "genre": ${oneOf(MUSIC_GENRES)} | null }
- apartment, house, office: {}
Rules:
- ${keep}
- title: null for a wedding; the festival's or concert's name for a festival or concert; for apartment, house and office, a short description of the work, in the transcript's language.
- style: null for ${oneOf(JOB_TYPES_WITHOUT_STYLE)}.
- First names only, no surnames, as they were said. Location as it was said. Country and region in English ("Italy", "Tuscany").
- For apartment, house and office, location is only the neighborhood or town, never a street address: this is published, and it is someone's home.
- pay: what the colleague taking the job earns, never the client's total price. "fixed" for one amount, in amount_min; "range" for two, in amount_min and amount_max. null when no amount is said.
- currency: the ISO 4217 code of the currency that was said ("EUR", "AUD"), or null when none was.
- Values from a list must be one of the listed values, or null.
- job_date: use the stated year when given, otherwise the next upcoming occurrence of that day and month relative to today (never a past date); null only when no day and month can be determined.`
}

function oneOf(values: string[]) {
  return values.map((value) => `"${value}"`).join(" | ")
}

// The model's answer is never trusted: whatever is not a valid value for the
// chosen job type's category is dropped here.
export function toJobFields(
  answer: Record<string, unknown>,
  jobTypes: string[],
  current: string | null,
) {
  const job_type = jobTypes.includes(answer?.job_type as string)
    ? (answer.job_type as string)
    : current
  const [category] = (job_type ?? "").split("_")
  return {
    job_type,
    title: TITLED_CATEGORIES.includes(category) ? text(answer?.title) : null,
    location: text(answer?.location),
    country: text(answer?.country),
    region: text(answer?.region),
    job_date: date(answer?.job_date),
    details: withoutStyle(job_type, details(category, answer?.details)),
    pay: pay(answer?.pay),
  }
}

function pay(answer: unknown) {
  const given = (answer ?? {}) as Record<string, unknown>
  const min = amount(given.amount_min)
  const max = amount(given.amount_max)
  const currency = CURRENCIES.includes(given.currency as string)
    ? (given.currency as string)
    : null
  if (min === null) return null
  if (given.kind === "fixed") {
    return { kind: "fixed", amount_min: min, amount_max: null, currency }
  }
  if (given.kind === "range" && max !== null && max > min) {
    return { kind: "range", amount_min: min, amount_max: max, currency }
  }
  return null
}

function amount(value: unknown) {
  return typeof value === "number" && value >= NO_AMOUNT ? value : null
}

function details(category: string, answer: unknown) {
  const given = (answer ?? {}) as Record<string, unknown>
  const fields = DETAILS_BY_CATEGORY[category] ?? {}
  return Object.fromEntries(
    Object.entries(fields).map(([field, allowed]) => {
      const value = text(given[field])
      return [field, !allowed || allowed.includes(value ?? "") ? value : null]
    }),
  )
}

function withoutStyle(
  job_type: string | null,
  fields: Record<string, string | null>,
) {
  return JOB_TYPES_WITHOUT_STYLE.includes(job_type ?? "")
    ? { ...fields, style: null }
    : fields
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function date(value: unknown) {
  return typeof value === "string" && ISO_DATE.test(value) ? value : null
}
