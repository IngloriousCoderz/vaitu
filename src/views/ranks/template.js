import assignmentOutline from "@iconify-icons/material-symbols/assignment-outline"
import socialLeaderboardOutline from "@iconify-icons/material-symbols/social-leaderboard-outline"
import starOutline from "@iconify-icons/material-symbols/star-outline"
import trophyOutline from "@iconify-icons/material-symbols/trophy-outline"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { Progress } from "@inglorious/ui/progress"
import { html } from "@inglorious/web"

import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { progressLabel, tierProgress } from "../../common/tiers.js"
import { t } from "../../i18n/index.js"
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
          <p class=${styles.subtitle}>${t("ranks.subtitle")}</p>

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
                        children: Icon.render({
                          icon: socialLeaderboardOutline,
                          size: "lg",
                        }),
                      }),
                      html`<span class=${styles.heroTier}>
                        ${progress.current ? t(`ranks.tier.${progress.current}`) : t("ranks.noRank")}
                      </span>`,
                      html`<span class=${styles.heroPoints}
                        >${t("ranks.points", { count: mine?.points ?? 0 })}</span
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
                  loadingText: t("ranks.loading"),
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
                                ${Icon.render({ icon: socialLeaderboardOutline, size: "lg" })}
                                ${t(`ranks.tier.${rank}`)}
                              `,
                            }),
                            html`<span class=${styles.rankPoints}>
                              ${t("ranks.minPoints", { count: rankMin(tiers, rank) })}
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
                          <span class=${styles.howTitle}
                            >${t("ranks.howTitle")}</span
                          >
                          ${this.renderHowRow({
                            icon: assignmentOutline,
                            points: tiers.perApplication,
                            label: t("ranks.perApplication"),
                          })}
                          ${this.renderHowRow({
                            icon: starOutline,
                            points: tiers.perShortlist,
                            label: t("ranks.perShortlist"),
                          })}
                          ${this.renderHowRow({
                            icon: trophyOutline,
                            points: tiers.perSelection,
                            label: t("ranks.perWin"),
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
          children: Icon.render({ icon, size: "lg" }),
        }),
        html`<span class=${styles.howText}>
          <strong>${t("ranks.points", { count: points })}</strong> ${label}
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
