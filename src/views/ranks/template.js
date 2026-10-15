import { Button } from "@inglorious/ui/button"
import { Progress } from "@inglorious/ui/progress"
import { html } from "@inglorious/web"

import { Icon } from "../../common/icon/index.js"
import { Page } from "../../common/page/index.js"
import { progressLabel, tierProgress } from "../../common/tiers.js"
import { capitalize } from "../../text/index.js"
import styles from "./style.module.css"

export const Ranks = {
  render(props, api) {
    return this.renderRanks(props, api)
  },

  renderRanks({ entity, onBack }) {
    const { status, error, tiers, mine } = entity
    const progress =
      status === "ready" && tiers ? tierProgress(mine?.points, tiers) : null

    return Page.render({
      variant: "sticky",
      children: [
        html`
          <header class=${styles.header}>
            ${Button.render({
              children: html`
                ${Icon.render({ name: "arrow-left", size: 16 })}
                <span>Back</span>
              `,
              variant: "ghost",
              className: "vaitu-back",
              ariaLabel: "Back",
              onClick: onBack,
            })}
            <span class=${styles.title}>Ranks</span>
          </header>

          <p class=${styles.subtitle}>
            Earn points with every application. Higher ranks show on your
            profile.
          </p>

          ${
            progress
              ? html`
                  <div class=${styles.hero}>
                    <span
                      class=${`${styles.heroMedal} ${progress.current ? styles[`${progress.current}Medal`] : ""}`}
                    >
                      ${Icon.render({ name: "medal", size: 36 })}
                    </span>
                    <span class=${styles.heroTier}>
                      ${progress.current ? capitalize(progress.current) : "No rank"}
                    </span>
                    <span class=${styles.heroPoints}
                      >${mine?.points ?? 0} pts</span
                    >
                    ${Progress.render({
                      value: progress.percent,
                      className: styles.progressTrack,
                    })}
                    <span class=${styles.heroLabel}>
                      ${progressLabel(mine?.points, tiers)}
                    </span>
                  </div>
                `
              : ""
          }

          <main class=${styles.list}>
            ${
              status === "loading"
                ? html`<p class=${styles.empty}>Loading ranks…</p>`
                : status === "error"
                  ? html`<p class=${styles.empty}>${error}</p>`
                  : tiers
                    ? RANK_ORDER.map(
                        (rank) => html`
                          <div
                            class=${`${styles[`${rank}Card`]} ${mine?.tier === rank ? styles.currentCard : ""}`}
                          >
                            <span class=${styles.rankName}>
                              ${Icon.render({ name: "medal", size: 20 })}
                              ${capitalize(rank)}
                            </span>
                            <span class=${styles.rankPoints}>
                              ${rankMin(tiers, rank)}+ pts
                            </span>
                          </div>
                        `,
                      )
                    : ""
            }
            ${
              status === "ready" && tiers
                ? html`
                    <div class=${styles.howCard}>
                      <span class=${styles.howTitle}>How points work</span>
                      ${this.renderHowRow({
                        icon: "clipboard-list",
                        points: tiers.perApplication,
                        label: "per application",
                      })}
                      ${this.renderHowRow({
                        icon: "star",
                        points: tiers.perShortlist,
                        label: "per shortlist",
                      })}
                      ${this.renderHowRow({
                        icon: "trophy",
                        points: tiers.perSelection,
                        label: "per win",
                      })}
                    </div>
                  `
                : ""
            }
          </main>
        `,
      ],
    })
  },

  renderHowRow({ icon, points, label }) {
    return html`
      <div class=${styles.howRow}>
        <span class=${styles.howIcon}
          >${Icon.render({ name: icon, size: 17 })}</span
        >
        <span class=${styles.howText}>
          <strong>${points} pts</strong> ${label}
        </span>
      </div>
    `
  },
}

const RANK_ORDER = ["bronze", "silver", "gold"]

function rankMin(tiers, rank) {
  if (rank === "gold") return tiers.goldMin
  if (rank === "silver") return tiers.silverMin
  return tiers.bronzeMin
}
