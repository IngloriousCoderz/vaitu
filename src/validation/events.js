import { z } from "zod"

import { DEFAULT_MAX_APPLICANTS, MIN_TEXT_LENGTH } from "../constants/index.js"
import { festivalGenres, weddingStyles } from "../data/event-taxonomy.js"

// The values behind these enums live in src/data/event-taxonomy.js, so a new
// style or genre is added in one place and both the schema and the filters
// pick it up.

const weddingStyle = z.enum(weddingStyles.map((s) => s.value))

const weddingDetailsSchema = z
  .object({
    style: weddingStyle.optional(),
    spouse_first_name_1: z.string().trim().min(MIN_TEXT_LENGTH),
    spouse_first_name_2: z.string().trim().min(MIN_TEXT_LENGTH),
  })
  .passthrough()

const festivalDetailsSchema = z
  .object({
    genre: z.enum(festivalGenres.map((g) => g.value)).optional(),
    headliner: z.string().trim().min(MIN_TEXT_LENGTH),
  })
  .passthrough()

const detailsSchemas = {
  wedding: weddingDetailsSchema,
  festival: festivalDetailsSchema,
}

const fallbackDetailsSchema = z.record(z.string(), z.unknown())

function detailsSchemaFor(category) {
  return detailsSchemas[category] ?? fallbackDetailsSchema
}

// Stricter shape for the creation form: everything the NOT NULL columns need.
// Standalone (not .extend) because Zod v4 forbids extending refined schemas.
export const createEventSchema = z
  .object({
    category: z.string().default("wedding"),
    title: z.string().trim().min(MIN_TEXT_LENGTH),
    location: z.string().trim().min(MIN_TEXT_LENGTH),
    country: z.string().trim().min(MIN_TEXT_LENGTH),
    region: z.string().trim().min(MIN_TEXT_LENGTH),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    application_deadline: z.string().datetime({ message: "Pick a deadline" }),
    max_applicants: z.number().int().positive().default(DEFAULT_MAX_APPLICANTS),
    audio_url: z.string().url().nullish(),
    transcript_status: z
      .enum(["none", "pending", "done", "error"])
      .default("none"),
    details: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((event, ctx) => {
    const parsed = detailsSchemaFor(event.category).safeParse(event.details)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: ["details", ...issue.path] })
      }
    }
  })
