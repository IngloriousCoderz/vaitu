import { Chip } from "@inglorious/ui/chip"

import { t } from "../../i18n/index.js"
import { capitalize } from "../../text/index.js"

const colors = {
  pending: "default",
  shortlisted: "info",
  selected: "success",
  rejected: "error",
  open: "success",
  closed: "default",
  assigned: "info",
}

export const StatusChip = {
  render({ status }) {
    return Chip.render({
      children: t(`status.${status}`, { defaultValue: capitalize(status) }),
      color: colors[status] ?? "default",
    })
  },
}
