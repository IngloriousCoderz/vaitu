import { html } from "@inglorious/web"

import { Footer, Header } from "../components/layout.js"
import { copy, localeOf, pageHead } from "../site.js"

const APP_URL = import.meta.env.VITE_APP_URL

export const metadata = (entity) => {
  const { title, description } = copy(entity)
  return {
    title,
    head: pageHead(entity, "/"),
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
    const lang = `?lang=${localeOf(entity)}`
    return html`
      ${Header.render(entity, "/")}

      <main>
        <section class="hero">
          <p class="eyebrow">${c.eyebrow}</p>
          <h1>${c.headline}</h1>
          <p class="lede">${c.lede}</p>
          <a
            class="cta"
            href=${`${APP_URL}/${lang}`}
            target="_blank"
            rel="noopener"
            >${c.cta}</a
          >
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
          <a
            class="cta"
            href=${`${APP_URL}/${lang}`}
            target="_blank"
            rel="noopener"
            >${c.cta}</a
          >
        </section>
      </main>

      ${Footer.render(entity)}
    `
  },
}
