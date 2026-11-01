import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

const ENV_FILE = "supabase/functions/.env"
const ENV_LINE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/
const QUOTED = /^(["'])(.*)\1$/

const only = process.argv.slice(2)
const ref = readFileSync("supabase/.temp/project-ref", "utf8").trim()

const lines = readFileSync(ENV_FILE, "utf8")
  .split("\n")
  .map((line) => line.match(ENV_LINE))
  .filter(Boolean)
  .filter(([, name]) => !only.length || only.includes(name))

const missing = only.filter((name) => !lines.some(([, n]) => n === name))
if (missing.length) throw new Error(`Not in ${ENV_FILE}: ${missing.join(", ")}`)

const dir = mkdtempSync(path.join(tmpdir(), "vaitu-secrets-"))
const file = path.join(dir, "secrets.env")
try {
  writeFileSync(file, `${lines.map(([line]) => line).join("\n")}\n`, {
    mode: 0o600,
  })
  execFileSync(
    "supabase",
    ["secrets", "set", "--project-ref", ref, "--env-file", file],
    { stdio: ["ignore", "ignore", "inherit"] },
  )
} finally {
  rmSync(dir, { recursive: true, force: true })
}

// Supabase only ever shows a secret's SHA-256, which is enough to compare.
const listed = JSON.parse(
  execFileSync(
    "supabase",
    ["secrets", "list", "--project-ref", ref, "-o", "json"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  ),
)
const remote = new Map(
  (listed.secrets ?? listed).map(({ name, value }) => [name, value]),
)

let hasMismatch = false
for (const [, name, raw] of lines) {
  const value = raw.match(QUOTED)?.[2] ?? raw
  const digest = createHash("sha256").update(value).digest("hex")
  const isSame = remote.get(name) === digest
  hasMismatch ||= !isSame
  console.log(`${isSame ? "ok  " : "DIFF"} ${name}`)
}
console.log(
  `Secrets pushed to ${ref}. Deploy functions for code changes to run.`,
)
if (hasMismatch) process.exitCode = 1
