import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { STATUS_CODE } from "jsr:@std/http@1/status"
import {
  currentUser,
  env,
  json,
  serve,
} from "npm:@inglorious/supabase@^0.2.0/edge"

import { sendEmail } from "../_shared/email.ts"
import { admin } from "../_shared/supabase.ts"

const REASONS = ["spam", "inappropriate", "fake", "harassment", "other"]
const TARGET_COLUMNS: Record<string, string> = {
  event: "event_id",
  user: "reported_user_id",
  review: "application_id",
}
const MAX_DETAILS = 1000
const DAY_MS = 86400000

serve(
  async (req) => {
    const db = admin()
    const user = await currentUser(db, req)
    if (!user) return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)

    const { target_type, target_id, reason, details } = await req.json()
    const column = TARGET_COLUMNS[target_type]
    if (!column || typeof target_id !== "string" || !REASONS.includes(reason)) {
      return json({ error: "Invalid report" }, STATUS_CODE.BadRequest)
    }

    const { data: config, error: configError } = await db
      .from("app_config")
      .select("value")
      .eq("key", "reports_daily_limit")
      .single()
    if (configError) throw configError

    const { count, error: countError } = await db
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", user.id)
      .gt("created_at", new Date(Date.now() - DAY_MS).toISOString())
    if (countError) throw countError
    if ((count ?? 0) >= config.value) {
      return json({ error: "report_limit" }, STATUS_CODE.TooManyRequests)
    }

    const note =
      typeof details === "string" && details.trim()
        ? details.trim().slice(0, MAX_DETAILS)
        : null

    const { data: report, error } = await db
      .from("reports")
      .insert({
        reporter_id: user.id,
        target_type,
        [column]: target_id,
        reason,
        details: note,
      })
      .select("id")
      .single()
    if (error) throw error

    // The report is safe in the table: a failed email must not fail the user.
    try {
      await sendEmail(
        env("ALERT_EMAIL"),
        `Vaitu: new report (${target_type}, ${reason})`,
        [
          `Report: ${report.id}`,
          `Target: ${target_type} ${target_id}`,
          `Reason: ${reason}`,
          `Details: ${note ?? "none"}`,
          `Reporter: ${user.id}`,
          "",
          "How to act on it: docs/moderation.md",
        ].join("\n"),
      )
    } catch (err) {
      console.error("report email failed", err)
    }

    return json({ reported: true })
  },
  { fallbackError: "report failed" },
)
