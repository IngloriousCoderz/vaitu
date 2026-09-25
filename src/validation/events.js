import { z } from "zod"

// Requires: pnpm add zod
//
// Per-category details schemas. Each category owns its fields independently —
// a future category adds its own entry here without reusing wedding's lists.

const weddingDetailsSchema = z
  .object({
    style: z
      .enum([
        "editorial",
        "documentary",
        "reportage",
        "classic",
        "film",
        "fine_art",
      ])
      .optional(),
  })
  .passthrough()

const detailsSchemas = {
  wedding: weddingDetailsSchema,
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
