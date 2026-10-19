import { ready } from "../i18n/index.js"

// Catalogues load on demand. The app waits for `ready` before the first
// render, so a test that reads a sentence sees the same words.
await ready
