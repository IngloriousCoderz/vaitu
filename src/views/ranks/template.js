import { Flex } from "@inglorious/ui/flex"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { Progress } from "@inglorious/ui/progress"
import { html } from "@inglorious/web"

import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { progressLabel, tierProgress } from "../../common/tiers.js"
import { capitalize } from "../../text/index.js"
import styles from "./style.module.css"

export const Ranks = {
  render(props, api) {
    return this.renderRanks(props, api)
  },

  renderRanks({ entity }) {
    const { status, error, tiers, mine } = entity
    const progress =
      status === "ready" && tiers ? tierProgress(mine?.points, tiers) : null

    return Page.render({
      variant: "document",
      read: true,
      children: [
        html`
          <p class=${styles.subtitle}>
            Earn points with every application. Higher ranks show on your
            profile.
          </p>

          ${
            progress
              ? html`
                  ${Flex.render({
                    direction: "column",
                    align: "center",
                    gap: "sm",
                    className: styles.hero,
                    children: [
                      Flex.render({
                        element: "span",
                        isInline: true,
                        className: `${styles.heroMedal} ${progress.current ? styles[`${progress.current}Medal`] : ""}`,
                        children: MaterialIcon.render({
                          name: "social_leaderboard",
                          size: "lg",
                        }),
                      }),
                      html`<span class=${styles.heroTier}>
                        ${progress.current ? capitalize(progress.current) : "No rank"}
                      </span>`,
                      html`<span class=${styles.heroPoints}
                        >${mine?.points ?? 0} pts</span
                      >`,
                      Progress.render({
                        value: progress.percent,
                        className: styles.progressTrack,
                      }),
                      html`<span class=${styles.heroLabel}>
                        ${progressLabel(mine?.points, tiers)}
                      </span>`,
                    ],
                  })}
                `
              : ""
          }
          ${Flex.render({
            element: "main",
            direction: "column",
            className: styles.list,
            children: html`
              ${
                PageStatus.render({
                  isError: status === "error",
                  error,
                  isLoading: status === "loading",
                  loadingText: "Loading ranks…",
                }) ??
                (tiers
                  ? RANK_ORDER.map(
                      (rank) => html`
                        ${Flex.render({
                          align: "center",
                          justify: "between",
                          className: `${styles[`${rank}Card`]} ${mine?.tier === rank ? styles.currentCard : ""}`,
                          children: [
                            Flex.render({
                              element: "span",
                              isInline: true,
                              align: "center",
                              gap: "sm",
                              className: styles.rankName,
                              children: html`
                                ${MaterialIcon.render({ name: "social_leaderboard", size: "lg" })}
                                ${capitalize(rank)}
                              `,
                            }),
                            html`<span class=${styles.rankPoints}>
                              ${rankMin(tiers, rank)}+ pts
                            </span>`,
                          ],
                        })}
                      `,
                    )
                  : "")
              }
              ${
                status === "ready" && tiers
                  ? html`
                      ${Flex.render({
                        direction: "column",
                        className: styles.howCard,
                        children: html`
                          <span class=${styles.howTitle}>How points work</span>
                          ${this.renderHowRow({
                            icon: "assignment",
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
                        `,
                      })}
                    `
                  : ""
              }
            `,
          })}
        `,
      ],
    })
  },

  renderHowRow({ icon, points, label }) {
    return Flex.render({
      align: "center",
      className: styles.howRow,
      children: [
        Flex.render({
          element: "span",
          isInline: true,
          align: "center",
          justify: "center",
          className: styles.howIcon,
          children: MaterialIcon.render({ name: icon, size: "lg" }),
        }),
        html`<span class=${styles.howText}>
          <strong>${points} pts</strong> ${label}
        </span>`,
      ],
    })
  },
}

const RANK_ORDER = ["bronze", "silver", "gold"]

function rankMin(tiers, rank) {
  if (rank === "gold") return tiers.goldMin
  if (rank === "silver") return tiers.silverMin
  return tiers.bronzeMin
}
