import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { linkedProject, serviceRoleKey } from "./supabase-project.mjs"

const { ref, url } = linkedProject()

const secrets = {
  project_url: url,
  service_role_key: serviceRoleKey(ref),
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
