// Naming the language transcribes names better than detecting it, but nova-3
// returned nothing for language=ar, so Arabic needs detection.
const NAMED_LANGUAGES = new Set(["en", "fr", "it", "ja"])

const DETECT_LANGUAGE = "multi"

export function deepgramLanguage(locale: unknown) {
  if (typeof locale !== "string") return DETECT_LANGUAGE
  const [language] = locale.toLowerCase().split("-")
  return NAMED_LANGUAGES.has(language) ? language : DETECT_LANGUAGE
}
