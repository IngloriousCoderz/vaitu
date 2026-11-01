import { spawnSync } from "node:child_process"
import process from "node:process"

// Plain JS can't tell the type-checker an entity's shape, so most of what tsc
// reports here is noise: `entity.x` on a BaseEntity, optional params read as
// required. These codes are the ones that mean something: a wrong value for a
// prop, an unknown prop, a missing import.
const MEANINGFUL = /error TS(2322|2353|2305|2307|2724):/

const { stdout } = spawnSync("tsc", ["-p", "tsconfig.typecheck.json"], {
  encoding: "utf-8",
})
const errors = stdout.split("\n").filter((line) => MEANINGFUL.test(line))

if (errors.length) {
  process.stderr.write(`${errors.join("\n")}\n`)
  process.exit(1)
}
