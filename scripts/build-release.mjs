import process from "node:process"

import { build } from "vite"

const MS_PER_SECOND = 1000

// What decides whether a published live update is newer than the installed code.
process.env.VITE_LIVE_UPDATE_RELEASE ??= String(
  Math.floor(Date.now() / MS_PER_SECOND),
)

await build()
console.log(`Release ${process.env.VITE_LIVE_UPDATE_RELEASE}`)
