import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"

import { SINGULAR } from "../../constants.js"
import { renderPage } from "../../page.js"
import { capitalize } from "../../text.js"
import { Card } from "../event-card/index.js"
import { Icon } from "../icon/index.js"
import styles from "./style.module.css"

const statusColors = {
  open: "success",
  closed: "default",
  assigned: "info",
}

export const MyEvents = {
  render(props, api) {
    this.renderMyEvents(props, api)
  },

  renderMyEvents({
    entity,
    onOpenEvent,
    onEdit,
    onAskDelete,
    onDelete,
    onCancelDelete,
  }) {
    const { events, status, error } = entity

    return renderPage({
      variant: "stickyFlat",
      children: [
        html`
          <header class=${styles.header}>
            <span class=${styles.title}>My Events</span>
          </header>

          <main class=${styles.list}>
            ${
              status === "loading"
                ? html`<p class=${styles.empty}>Loading events…</p>`
                : status === "error"
                  ? html`<p class=${styles.empty}>${error}</p>`
                  : !events.length
                    ? html`<p class=${styles.empty}>
                        You haven't posted any event yet.
                      </p>`
                    : events.map(
                        (event) => html`
                          <div class=${styles.event}>
                            ${Card.render({
                              event,
                              divider: false,
                              onOpen: onOpenEvent,
                            })}
                            <div class=${styles.eventFooter}>
                              ${Chip.render({
                                children: capitalize(event.status),
                                color: statusColors[event.status] ?? "default",
                              })}
                              <span class=${styles.count}>
                                ${event.applications_count}
                                application${
                                  event.applications_count === SINGULAR
                                    ? ""
                                    : "s"
                                }
                              </span>
                              <span class=${styles.rowActions}>
                                ${
                                  event.status === "open"
                                    ? html`
                                        ${IconButton.render({
                                          icon: Icon.render({
                                            name: "pencil",
                                            size: 16,
                                          }),
                                          ariaLabel: "Edit event",
                                          className: `${styles.miniButton} ${styles.editTint}`,
                                          onClick: () => onEdit(event.id),
                                        })}
                                      `
                                    : ""
                                }
                                ${IconButton.render({
                                  icon: Icon.render({
                                    name: "trash",
                                    size: 16,
                                  }),
                                  ariaLabel: "Delete event",
                                  className: `${styles.miniButton} ${styles.deleteTint}`,
                                  onClick: () => onAskDelete(event.id),
                                })}
                              </span>
                            </div>
                            ${
                              entity.confirming_delete === event.id
                                ? html`
                                    <p class=${styles.warn}>
                                      Delete this event and all its
                                      applications?
                                    </p>
                                    <div class=${styles.deleteRow}>
                                      ${Button.render({
                                        children: "Yes, delete",
                                        color: "error",
                                        variant: "outline",
                                        shape: "pill",
                                        size: "md",
                                        onClick: () => onDelete(event.id),
                                      })}
                                      ${Button.render({
                                        children: "Keep it",
                                        variant: "outline",
                                        shape: "pill",
                                        size: "md",
                                        onClick: onCancelDelete,
                                      })}
                                    </div>
                                  `
                                : ""
                            }
                          </div>
                        `,
                      )
            }
          </main>
        `,
      ],
    })
  },
}
