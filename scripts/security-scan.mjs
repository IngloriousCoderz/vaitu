import { execFileSync, spawn } from "node:child_process"
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, ".security-scan")
const BUILD = path.join(OUT, "dist")
const ZAP_IMAGE = "ghcr.io/zaproxy/zaproxy:stable"
const DOCKER_HOST = "host.docker.internal"
const PREVIEW_PORT = 4173
const TEST_ACCOUNT = { email: "seeker@vaitu.local", password: "test1234" }
const POLL_MS = 500
const POLL_TRIES = 60

const local = supabaseStatus()
const env = {
  ...process.env,
  VITE_SUPABASE_URL: local.API_URL,
  VITE_SUPABASE_ANON_KEY: local.ANON_KEY,
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const rules of ["app-rules.tsv", "api-rules.tsv"]) {
  copyFileSync(path.join(ROOT, "scripts", "zap", rules), path.join(OUT, rules))
}

console.log("Building the app against the local Supabase…")
execFileSync("npx", ["vite", "build", "--outDir", BUILD], {
  cwd: ROOT,
  env,
  stdio: "ignore",
})

const preview = spawn(
  "npx",
  [
    "vite",
    "preview",
    "--outDir",
    BUILD,
    "--port",
    String(PREVIEW_PORT),
    "--strictPort",
    "--host",
    "0.0.0.0",
  ],
  {
    cwd: ROOT,
    env: { ...env, __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: DOCKER_HOST },
    stdio: "ignore",
    detached: true,
  },
)

try {
  await waitFor(`http://127.0.0.1:${PREVIEW_PORT}/`)
  const session = await signIn()
  await writeApiSpec(session.access_token)
  const loginBefore = await lastLogin(session.user.id)

  console.log("Scanning the app (passive) and the REST API (active)…")
  const [app, api] = await Promise.all([
    zap("app", [
      "zap-baseline.py",
      "-t",
      `http://${DOCKER_HOST}:${PREVIEW_PORT}`,
      "-j",
      "-c",
      "app-rules.tsv",
    ]),
    zap(
      "api",
      [
        "zap-api-scan.py",
        "-t",
        "/zap/wrk/openapi.json",
        "-f",
        "openapi",
        "-c",
        "api-rules.tsv",
        "-z",
        replaceHeader("apikey", local.ANON_KEY),
      ],
      ["-e", `ZAP_AUTH_HEADER_VALUE=Bearer ${session.access_token}`],
    ),
  ])

  const isSignedIn = (await lastLogin(session.user.id)) !== loginBefore
  console.log(`\nApp scan: ${app.summary}`)
  console.log(`API scan: ${api.summary}`)
  console.log(
    `API scan signed in as ${TEST_ACCOUNT.email}: ${isSignedIn ? "yes" : "NO, its results only cover a signed-out visitor"}`,
  )
  console.log(`\nReports: ${path.relative(ROOT, OUT)}/{app,api}-report.html`)
  console.log(
    "The active scan wrote junk rows as the test account: run `supabase db reset` before relying on local data.",
  )
  process.exitCode = app.code || api.code || (isSignedIn ? 0 : 1)
} finally {
  process.kill(-preview.pid)
}

function supabaseStatus() {
  const output = execFileSync("supabase", ["status", "-o", "env"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
  return Object.fromEntries(
    output
      .split("\n")
      .map((line) => line.match(/^([A-Z_]+)="?([^"]*)"?$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value]),
  )
}

async function waitFor(url) {
  for (let attempt = 0; attempt < POLL_TRIES; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
  throw new Error(`${url} did not come up`)
}

async function signIn() {
  const res = await fetch(
    `${local.API_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: local.ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(TEST_ACCOUNT),
    },
  )
  if (!res.ok) throw new Error(`Sign-in failed: ${res.status}`)
  return res.json()
}

// Signed in, PostgREST describes every table and function the user can reach.
async function writeApiSpec(token) {
  const res = await fetch(`${local.API_URL}/rest/v1/`, {
    headers: {
      apikey: local.ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: "application/openapi+json",
    },
  })
  if (!res.ok) throw new Error(`OpenAPI spec failed: ${res.status}`)
  const spec = await res.json()
  const { port } = new URL(local.API_URL)
  spec.host = `${DOCKER_HOST}:${port}`
  spec.basePath = "/rest/v1"
  spec.schemes = ["http"]
  writeFileSync(path.join(OUT, "openapi.json"), JSON.stringify(spec))
}

// touch_login only succeeds signed in: a changed login time proves the scan
// carried the session.
async function lastLogin(userId) {
  const res = await fetch(
    `${local.API_URL}/rest/v1/profiles?id=eq.${userId}&select=last_login_at`,
    {
      headers: {
        apikey: local.SERVICE_ROLE_KEY,
        Authorization: `Bearer ${local.SERVICE_ROLE_KEY}`,
      },
    },
  )
  const [profile] = await res.json()
  return profile?.last_login_at ?? null
}

function replaceHeader(name, value) {
  const rule = "replacer.full_list(0)"
  return [
    `-config ${rule}.description=${name}`,
    `-config ${rule}.enabled=true`,
    `-config ${rule}.matchtype=REQ_HEADER`,
    `-config ${rule}.matchstr=${name}`,
    `-config ${rule}.regex=false`,
    `-config ${rule}.replacement=${value}`,
  ].join(" ")
}

function zap(name, args, dockerArgs = []) {
  return new Promise((resolve) => {
    const run = spawn("docker", [
      "run",
      "--rm",
      "-v",
      `${OUT}:/zap/wrk:rw`,
      ...dockerArgs,
      ZAP_IMAGE,
      ...args,
      "-r",
      `${name}-report.html`,
      "-J",
      `${name}-report.json`,
    ])
    let log = ""
    run.stdout.on("data", (chunk) => (log += chunk))
    run.stderr.on("data", (chunk) => (log += chunk))
    run.on("close", (code) => {
      writeFileSync(path.join(OUT, `${name}.log`), log)
      const findings = log
        .split("\n")
        .filter((line) =>
          /^(WARN-NEW|FAIL-NEW|FAIL-INPROG|WARN-INPROG):/.test(line),
        )
      const [summary = `exited with ${code}`] = findings.slice(-1)
      for (const line of findings.slice(0, -1)) console.log(`[${name}] ${line}`)
      resolve({ code, summary })
    })
  })
}
