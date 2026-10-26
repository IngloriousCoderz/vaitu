// Whether the installed build is older than the oldest one allowed. A
// platform with no row, or a build number that does not parse, is let through:
// the gate only ever closes on a clear answer.
export function isOutdated(build, version) {
  if (!version || !Number.isFinite(build)) return false
  return build < version.min_build
}
