import { Chip } from "@inglorious/ui/chip"
import { Flex } from "@inglorious/ui/flex"

import { TENTHS_PER_STAR } from "../../constants/index.js"
import { currentLocale, t } from "../../i18n/index.js"

const colors = {
  top_rated: "success",
  reliable: "success",
  generous: "info",
  serial_applicant: "default",
  serial_withdrawer: "warning",
  unreliable: "error",
  payment_issues: "error",
}

export const BADGES = Object.keys(colors)

const thresholds = {
  top_rated: (tiers) => ({
    stars: (tiers.topRatedMinTenths / TENTHS_PER_STAR).toLocaleString(
      currentLocale(),
    ),
    reviews: tiers.topRatedMinReviews,
  }),
  reliable: (tiers) => ({ jobs: tiers.reliableMinJobs }),
  generous: (tiers) => ({ jobs: tiers.generousMinHandoffs }),
  serial_applicant: (tiers) => ({
    applications: tiers.serialApplicantMinApplications,
  }),
  serial_withdrawer: (tiers) => ({
    withdrawals: tiers.serialWithdrawerMinWithdrawals,
    percent: tiers.serialWithdrawerMinPercent,
  }),
  unreliable: (tiers) => ({ failures: tiers.unreliableMinFailures }),
  payment_issues: (tiers) => ({ issues: tiers.paymentIssuesMin }),
}

export function badgeDescription(badge, tiers) {
  return t(`reputation.badges.${badge}.description`, thresholds[badge](tiers))
}

export const Badges = {
  /** @param {{ badges?: string[], justify?: "start" | "center" }} props */
  render({ badges = [], justify = "start" }) {
    return Flex.render({
      gap: "sm",
      wrap: "wrap",
      justify,
      children: badges.map((badge) => Badges.renderBadge(badge)),
    })
  },

  renderBadge(badge) {
    return Chip.render({
      children: t(`reputation.badges.${badge}.label`),
      color: colors[badge],
    })
  },
}
