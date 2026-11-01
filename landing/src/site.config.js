try {
  process.loadEnvFile()
} catch {
  // No .env on the host: its own variables are already in process.env.
}

const SITE_URL = process.env.VITE_SITE_URL
const ALTERNATES = [
  ["x-default", ""],
  ["it", ""],
  ["en", "/en"],
  ["fr", "/fr"],
  ["ja", "/ja"],
  ["ar", "/ar"],
]

export default {
  title: "Vaitu",
  head: ALTERNATES.map(
    ([lang, path]) =>
      `<link rel="alternate" hreflang="${lang}" href="${SITE_URL}${path}">`,
  ).join(""),
  favicon: "/logo.svg",
  i18n: {
    defaultLocale: "it",
    locales: ["it", "en", "fr", "ja", "ar"],
  },
  meta: {
    viewport: "width=device-width, initial-scale=1.0",
    "og:type": "website",
    "og:url": SITE_URL,
    "og:image": `${SITE_URL}/og.png`,
    "og:image:width": "1200",
    "og:image:height": "630",
    "twitter:card": "summary_large_image",
  },
  styles: ["/styles/style.css"],
  sitemap: { hostname: SITE_URL },
}
