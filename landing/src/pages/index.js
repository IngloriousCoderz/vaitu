import { html } from "@inglorious/web"

import { Footer, Header } from "../components/layout.js"
import {
  fill,
  GOOD_REVIEW_MIN_STARS,
  POINTS,
  POOR_REVIEW_MAX_STARS,
  signed,
  TIERS,
} from "../points.js"
import { copy, localeOf, pageHead } from "../site.js"

const APP_URL = import.meta.env.VITE_APP_URL
const PROFILES = {
  giada: "https://www.instagram.com/giadajoey.studio",
  matteo: "https://www.linkedin.com/in/antonymistretta",
}

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
          <ul class="highlights">
            ${c.highlights.map((highlight) => html`<li>${highlight}</li>`)}
          </ul>
          <a
            class="cta"
            href=${`${APP_URL}/${lang}`}
            target="_blank"
            rel="noopener"
            >${c.cta}</a
          >
          <p class="name">${c.nameOrigin}</p>
        </section>

        <section class="band deep">
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
          ${renderPoints(c)}
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
          <h2>${c.professionsTitle}</h2>
          <ul class="professions">
            ${c.professions.map((profession) => html`<li>${profession}</li>`)}
          </ul>
          <p class="early"><strong>${c.earlyTitle}</strong> ${c.earlyBody}</p>
        </section>

        <section class="band deep about">
          <h2>${c.aboutTitle}</h2>
          <div class="story">
            <p>${c.about.intro}</p>
            ${c.about.people.map(
              (person) =>
                html`<h3>${renderName(person)}</h3>
                  <p>${person.body}</p>`,
            )}
            <h3>${c.about.visionTitle}</h3>
            ${c.about.vision.map((paragraph) => html`<p>${paragraph}</p>`)}
          </div>
        </section>

        <section class="band">
          <h2>${c.faqTitle}</h2>
          <div class="faq">
            ${c.faq.map(
              (item) =>
                html`<details>
                  <summary>${item.question}</summary>
                  <p>${fill(item.answer, { ...POINTS, ...TIERS })}</p>
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

function renderPoints(c) {
  const stars = {
    perGoodReview: GOOD_REVIEW_MIN_STARS,
    perPoorReview: POOR_REVIEW_MAX_STARS,
  }
  return html`
    <div class="points">
      <div>
        <h3>${c.pointsTitle}</h3>
        <p>${c.pointsBody}</p>
      </div>
      <ul class="rules">
        ${Object.entries(POINTS).map(
          ([key, points]) =>
            html`<li>
              <strong>${signed(points)}</strong>
              ${fill(c.pointsRules[key], { stars: stars[key] })}
            </li>`,
        )}
      </ul>
      <ul class="tiers">
        ${Object.entries(TIERS).map(
          ([tier, points]) =>
            html`<li class=${tier}>
              <strong>${c.tiers[tier]}</strong>
              ${fill(c.tierFrom, { points })}
            </li>`,
        )}
      </ul>
    </div>
  `
}

function renderName({ id, name, title }) {
  const [before, after] = title.split("{{name}}")
  return html`${before}<a href=${PROFILES[id]}>${name}</a>${after}`
}
