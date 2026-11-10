import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

/** The linked project, as `supabase link` left it. */
export function linkedProject() {
  const ref = readFileSync("supabase/.temp/project-ref", "utf8").trim()
  return { ref, url: `https://${ref}.supabase.co` }
}

/** The legacy service_role key, from the Supabase CLI's login: never written down. */
export function serviceRoleKey(ref) {
  const keys = JSON.parse(
    execFileSync(
      "supabase",
      ["projects", "api-keys", "--project-ref", ref, "-o", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ),
  )
  const key = keys.find(
    ({ name, type }) => name === "service_role" && type === "legacy",
  )?.api_key
  if (!key) throw new Error("No legacy service_role key found")
  return key
}
