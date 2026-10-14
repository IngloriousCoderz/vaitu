import {
  FIRST_INDEX,
  LAST_INDEX_OFFSET,
  PAD_LENGTH,
  UUID_HEX_RADIX,
  UUID_RANDOM_BYTES,
  UUID_SECTION_SIZES,
  UUID_VARIANT_BITS,
  UUID_VARIANT_INDEX,
  UUID_VARIANT_MASK,
  UUID_VERSION_BITS,
  UUID_VERSION_INDEX,
  UUID_VERSION_MASK,
} from "../constants/index.js"

export function capitalize(text) {
  return (
    text.at(FIRST_INDEX).toUpperCase() +
    text.slice(FIRST_INDEX + LAST_INDEX_OFFSET)
  )
}

// crypto.randomUUID needs a secure context (missing over http LAN).
export function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  const bytes = new Uint8Array(UUID_RANDOM_BYTES)
  crypto.getRandomValues(bytes)
  bytes[UUID_VERSION_INDEX] =
    (bytes[UUID_VERSION_INDEX] & UUID_VERSION_MASK) | UUID_VERSION_BITS
  bytes[UUID_VARIANT_INDEX] =
    (bytes[UUID_VARIANT_INDEX] & UUID_VARIANT_MASK) | UUID_VARIANT_BITS
  const hex = [...bytes]
    .map((byte) => byte.toString(UUID_HEX_RADIX).padStart(PAD_LENGTH, "0"))
    .join("")
  let at = FIRST_INDEX
  const sections = UUID_SECTION_SIZES.map((size) => {
    const part = hex.slice(at, at + size)
    at += size
    return part
  })
  return sections.join("-")
}
