import { z } from "zod"

// Requires: pnpm add zod
//
// Per-category details schemas. Each category owns its fields independently —
// a future category adds its own entry here without reusing wedding's lists.

// Single source of truth for wedding styles: valid values + display labels.
// Filters and cards derive from here, so adding a style touches one place.
export const weddingStyles = [
  { value: "editorial", label: "Editorial" },
  { value: "documentary", label: "Documentary" },
  { value: "reportage", label: "Reportage" },
  { value: "classic", label: "Classic" },
  { value: "film", label: "Film" },
  { value: "fine_art", label: "Fine Art" },
]

const weddingStyle = z.enum(weddingStyles.map((s) => s.value))

const weddingDetailsSchema = z
  .object({
    style: weddingStyle.optional(),
    spouseFirstName1: z.string().trim().min(1),
    spouseFirstName2: z.string().trim().min(1),
  })
  .passthrough()

// Single source of truth for festival genres: valid values + display labels.
export const festivalGenres = [
  { value: "house", label: "House" },
  { value: "techno", label: "Techno" },
  { value: "indie", label: "Indie" },
  { value: "jazz", label: "Jazz" },
  { value: "electronic", label: "Electronic" },
]

const festivalDetailsSchema = z
  .object({
    genre: z.enum(festivalGenres.map((g) => g.value)).optional(),
    headliner: z.string().trim().min(1),
  })
  .passthrough()

const detailsSchemas = {
  wedding: weddingDetailsSchema,
  festival: festivalDetailsSchema,
}

const fallbackDetailsSchema = z.record(z.string(), z.unknown())

export function detailsSchemaFor(category) {
  return detailsSchemas[category] ?? fallbackDetailsSchema
}

export const eventSchema = z
  .object({
    category: z.string().default("wedding"),
    title: z.string().trim().min(1),
    location: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    event_date: z.string().optional(), // ISO date, YYYY-MM-DD
    application_deadline: z.string().datetime().optional(),
    max_applicants: z.number().int().positive().default(5),
    status: z.enum(["open", "closed", "assigned"]).default("open"),
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
