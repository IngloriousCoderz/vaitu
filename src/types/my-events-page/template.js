import { html } from "@inglorious/web"
import { Chip } from "@inglorious/ui/chip"

import { renderCard } from "../event-card/index.js"
import { renderTabbar } from "../tab-bar/template.js"
import styles from "./style.module.css"

const statusColors = {
  open: "success",
  closed: "default",
  assigned: "info",
}

function statusLabel(status) {
  return status[0].toUpperCase() + status.slice(1)
}

export function renderMyEvents({ entity, onOpenEvent, onNavigate }) {
  const { events, status, error } = entity

  return html`
    <div class=${styles.page} data-category="wedding">
      <header class=${styles.header}>
        <span class=${styles.title}>My Events</span>
      </header>

      <main class=${styles.list}>
        ${status === "loading"
          ? html`<p class=${styles.empty}>Loading events…</p>`
          : status === "error"
            ? html`<p class=${styles.empty}>${error}</p>`
            : events.length === 0
              ? html`<p class=${styles.empty}>
                  You haven't posted any event yet.
                </p>`
              : events.map(
                  (event) => html`
                    <div class=${styles.event}>
                      ${renderCard({
                        event,
                        onOpen: onOpenEvent,
                      })}
                      <div class=${styles.eventFooter}>
                        ${Chip.render({
                          children: statusLabel(event.status),
                          color: statusColors[event.status] ?? "default",
                        })}
                        <span class=${styles.count}>
                          ${event.applications_count} application${event.applications_count ===
                          1
                            ? ""
                            : "s"}
                        </span>
                      </div>
                    </div>
                  `,
                )}
      </main>

      ${renderTabbar({
        active: "events",
        onNavigate,
        tabs: [
          { value: "events", label: "My Events", icon: "compass" },
          { value: "new", label: "New", icon: "plus" },
          { value: "profile", label: "Profile", icon: "user" },
        ],
      })}
    </div>
  `
}
