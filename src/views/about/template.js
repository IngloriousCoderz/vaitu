import { Accordion } from "@inglorious/ui/accordion"
import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"

import { Page } from "../../common/page/index.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import styles from "./style.module.css"

const FAQ = [
  "whatIs",
  "name",
  "audience",
  "publish",
  "apply",
  "choose",
  "contact",
  "payments",
  "changeMind",
  "ranks",
  "report",
  "notifications",
  "leave",
]

const CREDITS = [
  {
    role: "idea",
    name: "Giada Joey Cazzola",
    links: [
      {
        label: "giadajoeycazzola.com",
        href: "https://www.giadajoeycazzola.com/",
      },
      {
        label: "Instagram",
        href: "https://www.instagram.com/giadajoey.studio/",
      },
    ],
  },
  {
    role: "development",
    name: "Matteo Antony Mistretta",
    links: [
      { label: "Inglorious Coderz", href: "https://www.ingloriouscoderz.it/" },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/antonymistretta",
      },
    ],
  },
  {
    role: "technology",
    name: "Inglorious Forge",
    links: [{ label: "inglorious.dev", href: "https://inglorious.dev" }],
  },
]

export const About = {
  render() {
    return this.renderAbout()
  },

  renderAbout({ onOpen }) {
    return Page.render({
      variant: "document",
      read: true,
      children: [
        html`
          <h2 class=${styles.sectionTitle}>${t("about.faqTitle")}</h2>
          ${Accordion.render({
            name: "faq",
            items: FAQ.map((id) => ({
              id,
              title: t(`about.faq.${id}.question`),
              content: t(`about.faq.${id}.answer`),
            })),
          })}

          <h2 class=${styles.sectionTitle}>${t("about.creditsTitle")}</h2>
          <dl class=${styles.credits}>${CREDITS.map(this.renderCredit)}</dl>

          <h2 class=${styles.sectionTitle}>${t("about.legalTitle")}</h2>
          ${Flex.render({
            direction: "column",
            gap: "sm",
            children: [
              Button.render({
                children: t("legal.privacy.title"),
                variant: "outline",
                shape: "pill",
                size: "md",
                isFullWidth: true,
                onClick: () => onOpen(paths.privacy),
              }),
              Button.render({
                children: t("legal.terms.title"),
                variant: "outline",
                shape: "pill",
                size: "md",
                isFullWidth: true,
                onClick: () => onOpen(paths.terms),
              }),
            ],
          })}
        `,
      ],
    })
  },

  renderCredit({ role, name, links }) {
    return html`
      <div class=${styles.credit}>
        <dt class=${styles.role}>${t(`about.credits.${role}`)}</dt>
        <dd class=${styles.person}>
          <span class=${styles.name}>${name}</span>
          <span class=${styles.links}>
            ${links.map(
              ({ label, href }) => html`
                <a
                  class=${styles.link}
                  href=${href}
                  target="_blank"
                  rel="noopener"
                  >${label}</a
                >
              `,
            )}
          </span>
        </dd>
      </div>
    `
  },
}
