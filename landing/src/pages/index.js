import { html } from "@inglorious/web"

import ar from "../i18n/ar.json"
import en from "../i18n/en.json"
import fr from "../i18n/fr.json"
import it from "../i18n/it.json"
import ja from "../i18n/ja.json"

const catalogues = { it, en, fr, ja, ar }
const LANGUAGES = [
  { locale: "it", label: "Italiano", href: "/" },
  { locale: "en", label: "English", href: "/en" },
  { locale: "fr", label: "Français", href: "/fr" },
  { locale: "ja", label: "日本語", href: "/ja" },
  { locale: "ar", label: "العربية", href: "/ar" },
]
const APP_URL = import.meta.env.VITE_APP_URL
const LEGAL_NAME = import.meta.env.VITE_LEGAL_NAME
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL

function copy(entity) {
  return catalogues[entity.locale] ?? it
}

export const metadata = (entity) => {
  const { title, description } = copy(entity)
  return {
    title,
    meta: {
      description,
      "og:title": title,
      "og:description": description,
      "twitter:title": title,
      "twitter:description": description,
    },
  }
}

export const landing = {
  render(entity) {
    const c = copy(entity)
    return html`
      <header class="top">
        <a class="brand" href="/">
          <img src="/logo.svg" alt="" width="40" height="27" />
          <span>vaitu</span>
        </a>
        <nav class="languages" aria-label=${c.languageLabel}>
          ${LANGUAGES.map(
            ({ locale, label, href }) =>
              html`<a
                href=${href}
                lang=${locale}
                aria-current=${
                  locale === (entity.locale ?? "it") ? "page" : "false"
                }
                >${label}</a
              >`,
          )}
        </nav>
      </header>

      <main>
        <section class="hero">
          <p class="eyebrow">${c.eyebrow}</p>
          <h1>${c.headline}</h1>
          <p class="lede">${c.lede}</p>
          <a class="cta" href=${APP_URL}>${c.cta}</a>
          <p class="note">${c.ctaNote}</p>
          <p class="name">${c.nameOrigin}</p>
        </section>

        <section class="band">
          <h2>${c.howTitle}</h2>
          <ol class="steps">
            ${c.steps.map(
              (step) =>
                html`<li>
                  <h3>${step.title}</h3>
                  <p>${step.body}</p>
                </li>`,
            )}
          </ol>
        </section>

        <section>
          <h2>${c.sidesTitle}</h2>
          <div class="cards">
            ${c.sides.map(
              (side) =>
                html`<article class="card">
                  <h3>${side.title}</h3>
                  <ul>
                    ${side.points.map((point) => html`<li>${point}</li>`)}
                  </ul>
                </article>`,
            )}
          </div>
        </section>

        <section class="band">
          <h2>${c.trustTitle}</h2>
          <ul class="facts">
            ${c.trust.map(
              (fact) =>
                html`<li>
                  <h3>${fact.title}</h3>
                  <p>${fact.body}</p>
                </li>`,
            )}
          </ul>
        </section>

        <section>
          <h2>${c.tradesTitle}</h2>
          <ul class="trades">
            ${c.trades.map((trade) => html`<li>${trade}</li>`)}
          </ul>
          <p class="early"><strong>${c.earlyTitle}</strong> ${c.earlyBody}</p>
        </section>

        <section class="band">
          <h2>${c.faqTitle}</h2>
          <div class="faq">
            ${c.faq.map(
              (item) =>
                html`<details>
                  <summary>${item.question}</summary>
                  <p>${item.answer}</p>
                </details>`,
            )}
          </div>
        </section>

        <section class="closing">
          <h2>${c.closing}</h2>
          <a class="cta" href=${APP_URL}>${c.cta}</a>
        </section>
      </main>

      <footer class="foot">
        <p>${c.credits}</p>
        <p>
          <a href=${`${APP_URL}/privacy`}>${c.privacy}</a>
          <a href=${`${APP_URL}/terms`}>${c.terms}</a>
          <a href=${`mailto:${CONTACT_EMAIL}`}>${c.contact}</a>
        </p>
        <p>© ${LEGAL_NAME}</p>
      </footer>
    `
  },
}
