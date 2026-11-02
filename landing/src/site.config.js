try {
  process.loadEnvFile()
} catch {
  // No .env on the host: its own variables are already in process.env.
}

const SITE_URL = process.env.VITE_SITE_URL

export default {
  title: "Vaitu",
  favicon: "/logo.svg",
  i18n: {
    defaultLocale: "en",
    // fr, ja and ar stay translated in src/i18n, but launch builds only these.
    locales: ["en", "it"],
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
