export function isOutdated(build, version) {
  if (!version || !Number.isFinite(build)) return false
  return build < version.min_build
}
