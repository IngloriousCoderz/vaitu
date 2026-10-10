import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

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

    return html`
      <div class=${styles.page} data-category="wedding">
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
                  color: option.id === status_filter ? "primary" : "default",
                })}
              </button>
            `,
          )}
        </div>

        <main class=${styles.list}>
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
                  : shown.map((application) =>
                      this.renderApplicationItem({ application, onOpenEvent }),
                    )
          }
        </main>
      </div>
    `
  },

  renderApplicationItem({ application, onOpenEvent }) {
    const isWinner = application.applicationStatus === "selected"
    return html`
      <div
        class=${
          isWinner
            ? `${styles.application} ${styles.winner}`
            : styles.application
        }
      >
        ${Card.render({ event: application, divider: false, onOpen: onOpenEvent })}
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
