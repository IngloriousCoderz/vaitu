import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { generateLiveUpdateKeys } from "@inglorious/supabase/live-update"

import { PRIVATE_KEY_PATH, PUBLIC_KEY_PATH } from "./live-update-paths.mjs"

if (existsSync(PRIVATE_KEY_PATH)) {
  throw new Error(`${PRIVATE_KEY_PATH} already exists: keep using it`)
}

const { privateKey, publicKey } = generateLiveUpdateKeys()
mkdirSync(path.dirname(PRIVATE_KEY_PATH), { recursive: true })
writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 })
writeFileSync(PUBLIC_KEY_PATH, publicKey)

console.log(`Private key: ${PRIVATE_KEY_PATH} (back it up, never commit it)`)
console.log(
  `Public key: ${PUBLIC_KEY_PATH} (commit it, then release a new native build)`,
)
