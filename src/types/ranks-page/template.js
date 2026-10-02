import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

import { capitalize } from "../../text.js"
import { renderIcon } from "../icon/index.js"
import { progressLabel, tierProgress } from "../profile/helpers.js"
import styles from "./style.module.css"

const RANK_ORDER = ["bronze", "silver", "gold"]

function rankMin(tiers, rank) {
  if (rank === "gold") return tiers.goldMin
  if (rank === "silver") return tiers.silverMin
  return tiers.bronzeMin
}

export function renderRanks({ entity, onBack }) {
  const { status, error, tiers, mine } = entity
  const progress =
    status === "ready" && tiers ? tierProgress(mine?.points, tiers) : null

  return html`
    <div class=${styles.page} data-category="wedding">
      <header class=${styles.header}>
        ${Button.render({
          children: html`
            ${renderIcon({ name: "arrow-left", size: 16 })}
            <span>Back</span>
          `,
          variant: "ghost",
          className: styles.back,
          ariaLabel: "Back",
          onClick: onBack,
        })}
        <span class=${styles.title}>Ranks</span>
      </header>

      <p class=${styles.subtitle}>
        Earn points with every application. Higher ranks show on your profile.
      </p>

      ${
        progress
          ? html`
              <div class=${styles.hero}>
                <span class=${styles.heroTier}>
                  ${progress.current ? capitalize(progress.current) : "No rank"}
                </span>
                <span class=${styles.heroPoints}>${mine?.points ?? 0} pts</span>
                <div class=${styles.progressTrack}>
                  <div
                    class=${styles.progressFill}
                    style=${`width: ${progress.percent}%`}
                  ></div>
                </div>
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
                          ${Chip.render({ children: capitalize(rank) })}
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
                  <span class=${styles.howRow}>
                    ${tiers.perApplication} pts per application
                  </span>
                  <span class=${styles.howRow}>
                    ${tiers.perShortlist} pts per shortlist
                  </span>
                  <span class=${styles.howRow}>
                    ${tiers.perSelection} pts per win
                  </span>
                </div>
              `
            : ""
        }
      </main>
    </div>
  `
}
