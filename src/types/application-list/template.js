import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

import { LIST_STAGGER_CAP } from "../../constants.js"
import { renderPage } from "../../page.js"
import { capitalize } from "../../text.js"
import { Card } from "../event-card/index.js"
import { Icon } from "../icon/index.js"
import styles from "./style.module.css"

const StatusColors = {
  pending: "default",
  shortlisted: "info",
  selected: "success",
  rejected: "error",
}

const FilterOptions = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "selected", label: "Selected" },
  { id: "rejected", label: "Rejected" },
]

export const ApplicationList = {
  render(props, api) {
    return this.renderApplicationList(props, api)
  },

  renderApplicationList({ entity, onOpenEvent, onSelectStatus }) {
    const { applications, status_filter, status, error } = entity
    const shown =
      status_filter === "all"
        ? applications
        : applications.filter((a) => a.applicationStatus === status_filter)

    return renderPage({
      variant: "sticky",
      children: [
        html`
          <div class=${styles.stickyTop}>
            <header class=${styles.header}>
              <span class=${styles.title}>My Applications</span>
            </header>

            <div class=${styles.chips}>
              ${FilterOptions.map(
                (option) => html`
                  <button
                    type="button"
                    class=${styles.chipButton}
                    @click=${() => onSelectStatus(option.id)}
                  >
                    ${Chip.render({
                      children: option.label,
                      color:
                        option.id === status_filter ? "primary" : "default",
                    })}
                  </button>
                `,
              )}
            </div>
          </div>

          <main class="${styles.list} vaitu-list">
            ${
              status === "loading"
                ? html`<p class=${styles.empty}>Loading applications…</p>`
                : status === "error"
                  ? html`<p class=${styles.empty}>${error}</p>`
                  : !shown.length
                    ? html`<p class=${styles.empty}>
                        ${
                          !applications.length
                            ? "You haven't applied for any event yet."
                            : "Nothing with this status."
                        }
                      </p>`
                    : shown.map((application, index) =>
                        this.renderApplicationItem({
                          application,
                          onOpenEvent,
                          index,
                        }),
                      )
            }
          </main>
        `,
      ],
    })
  },

  renderApplicationItem({ application, onOpenEvent, index }) {
    const isWinner = application.applicationStatus === "selected"
    const itemClass = [
      styles.application,
      isWinner ? styles.winner : "",
      "vaitu-list-item",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <div
        class=${itemClass}
        style=${`--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`}
      >
        ${Card.render({
          event: application,
          divider: false,
          onOpen: onOpenEvent,
        })}
        <div class=${styles.applicationFooter}>
          ${
            isWinner
              ? html`<span class=${styles.winnerTrophy}>
                  ${Icon.render({ name: "trophy", size: 20 })}
                </span>`
              : Chip.render({
                  children: capitalize(application.applicationStatus),
                  color:
                    StatusColors[application.applicationStatus] ?? "default",
                })
          }
        </div>
      </div>
    `
  },
}
