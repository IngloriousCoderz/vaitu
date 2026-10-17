import { Chip } from "@inglorious/ui/chip"

import { capitalize } from "../../text/index.js"

// One colour per status, for applications and for events alike. The two sets
// of names do not overlap, so they share a table.
const colors = {
  // applications
  pending: "default",
  shortlisted: "info",
  selected: "success",
  rejected: "error",
  // events
  open: "success",
  closed: "default",
  assigned: "info",
}

export const StatusChip = {
  render({ status }) {
    return Chip.render({
      children: capitalize(status),
      color: colors[status] ?? "default",
    })
  },
}
