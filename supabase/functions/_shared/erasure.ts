import { encodeHex } from "jsr:@std/encoding@1/hex"

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  )
  return encodeHex(new Uint8Array(digest))
}
