// Sets what the push trigger calls push-notify with in the linked project's
// Vault: the project's own URL, and its legacy service-role key (the one
// push-notify can read a role out of). The key comes from the Supabase CLI's
// login and goes straight into Vault, so it is never written down: not in
// git, not in a seed, not on the command line. Run it after every reset of
// the linked project; it overwrites whatever is there.

import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const ref = readFileSync("supabase/.temp/project-ref", "utf8").trim()

const keys = JSON.parse(
  execFileSync(
    "supabase",
    ["projects", "api-keys", "--project-ref", ref, "-o", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ),
)
const serviceRoleKey = keys.find(
  ({ name, type }) => name === "service_role" && type === "legacy",
)?.api_key
if (!serviceRoleKey) throw new Error("No legacy service_role key found")

const secrets = {
  project_url: `https://${ref}.supabase.co`,
  service_role_key: serviceRoleKey,
}

const sql = `do $$
declare
  v_id uuid;
begin
${Object.entries(secrets)
  .map(
    ([
      name,
      value,
    ]) => `  select id into v_id from vault.secrets where name = '${name}';
  if v_id is null then
    perform vault.create_secret('${value}', '${name}');
  else
    perform vault.update_secret(v_id, '${value}');
  end if;`,
  )
  .join("\n")}
end;
$$;
`

// A file rather than an argument, which any process could read; readable by
// this user only, and gone once the query has run.
const dir = mkdtempSync(path.join(tmpdir(), "vaitu-vault-"))
const file = path.join(dir, "secrets.sql")
try {
  writeFileSync(file, sql, { mode: 0o600 })
  execFileSync("supabase", ["db", "query", "--linked", "--file", file], {
    stdio: ["ignore", "ignore", "inherit"],
  })
} finally {
  rmSync(dir, { recursive: true, force: true })
}

console.log(`Vault set for ${ref}: ${Object.keys(secrets).join(", ")}`)
