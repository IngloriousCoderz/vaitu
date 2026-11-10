import { execFileSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import process from "node:process"

import { publishLiveUpdate } from "@inglorious/supabase/live-update"

import { PRIVATE_KEY_PATH } from "./live-update-paths.mjs"
import { linkedProject, serviceRoleKey } from "./supabase-project.mjs"

const MS_PER_SECOND = 1000
const NO_REMOTE = /^0+$/
const NOT_THE_APP = [
  /^landing\//,
  /^docs\//,
  /^supabase\//,
  /^\.changeset\//,
  /^\.github\//,
  /\.md$/,
]

const isOnPush = process.argv.includes("--on-push")

if (isOnPush && !(await pushesAppChanges())) process.exit(0)

if (!existsSync(PRIVATE_KEY_PATH)) {
  const message = `No live update key at ${PRIVATE_KEY_PATH}: run pnpm live:keys`
  if (isOnPush) {
    console.log(`${message}. Skipping the live update.`)
    process.exit(0)
  }
  throw new Error(message)
}

const release = Math.floor(Date.now() / MS_PER_SECOND)
const checkout = mkdtempSync(path.join(tmpdir(), "vaitu-live-update-"))
git("worktree", "add", "--detach", checkout, "HEAD")
try {
  symlinkSync(path.resolve("node_modules"), path.join(checkout, "node_modules"))
  if (existsSync(".env")) copyFileSync(".env", path.join(checkout, ".env"))
  execFileSync("pnpm", ["build:release"], {
    cwd: checkout,
    stdio: "inherit",
    env: { ...process.env, VITE_LIVE_UPDATE_RELEASE: String(release) },
  })

  const { minBuild } = JSON.parse(
    readFileSync(path.join(checkout, "package.json"), "utf8"),
  ).liveUpdate
  const { ref, url } = linkedProject()
  const manifest = await publishLiveUpdate({
    dist: path.join(checkout, "dist"),
    release,
    minBuild,
    privateKey: readFileSync(PRIVATE_KEY_PATH, "utf8"),
    projectUrl: url,
    serviceKey: serviceRoleKey(ref),
  })
  console.log(
    `Live update ${manifest.release} published for builds ${minBuild} and up.`,
  )
} finally {
  git("worktree", "remove", "--force", checkout)
}

// The refs git is pushing, on stdin: whether main gets commits that touch the app.
async function pushesAppChanges() {
  let input = ""
  for await (const chunk of process.stdin) input += chunk
  return input
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(" "))
    .filter(([, , remoteRef]) => remoteRef === "refs/heads/main")
    .some(([, localSha, , remoteSha]) => {
      if (localSha !== git("rev-parse", "HEAD")) return false
      if (NO_REMOTE.test(remoteSha)) return true
      return git("diff", "--name-only", remoteSha, localSha)
        .split("\n")
        .some((file) => file && !NOT_THE_APP.some((rule) => rule.test(file)))
    })
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim()
}
